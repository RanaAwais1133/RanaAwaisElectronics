package config

import (
	"context"
	"database/sql"
	"fmt"
	"log"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// ═══════════════════════════════════════
// 🔌 DB HELPER INTERFACE
// ═══════════════════════════════════════

// RowScanner is the interface for scanning a single row
type RowScanner interface {
	Scan(dest ...interface{}) error
}

// RowIterator is the interface for iterating over rows
type RowIterator interface {
	Next() bool
	Scan(dest ...interface{}) error
	Close() error
}

// DBHelper provides a unified interface for database operations
type DBHelper interface {
	QueryRow(query string, args ...interface{}) RowScanner
	Query(query string, args ...interface{}) (RowIterator, error)
	Exec(query string, args ...interface{}) error
	QueryContext(ctx context.Context, query string, args ...interface{}) (RowIterator, error)
	ExecContext(ctx context.Context, query string, args ...interface{}) error
	QueryRowContext(ctx context.Context, query string, args ...interface{}) RowScanner
	Begin() (Transaction, error)
}

// Transaction represents a database transaction
type Transaction interface {
	Exec(query string, args ...interface{}) error
	Commit() error
	Rollback() error
}

// ═══════════════════════════════════════
// 🗄️ SQLITE IMPLEMENTATION
// ═══════════════════════════════════════

type sqliteHelper struct {
	db *sql.DB
}

func (h *sqliteHelper) QueryRow(query string, args ...interface{}) RowScanner {
	return h.db.QueryRow(query, args...)
}

func (h *sqliteHelper) Query(query string, args ...interface{}) (RowIterator, error) {
	rows, err := h.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	return &sqliteRowIterator{rows: rows}, nil
}

func (h *sqliteHelper) Exec(query string, args ...interface{}) error {
	_, err := h.db.Exec(query, args...)
	return err
}

func (h *sqliteHelper) QueryContext(ctx context.Context, query string, args ...interface{}) (RowIterator, error) {
	rows, err := h.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	return &sqliteRowIterator{rows: rows}, nil
}

func (h *sqliteHelper) ExecContext(ctx context.Context, query string, args ...interface{}) error {
	_, err := h.db.ExecContext(ctx, query, args...)
	return err
}

func (h *sqliteHelper) QueryRowContext(ctx context.Context, query string, args ...interface{}) RowScanner {
	return h.db.QueryRowContext(ctx, query, args...)
}

func (h *sqliteHelper) Begin() (Transaction, error) {
	tx, err := h.db.Begin()
	if err != nil {
		return nil, err
	}
	return &sqliteTransaction{tx: tx}, nil
}

type sqliteRowIterator struct {
	rows *sql.Rows
}

func (it *sqliteRowIterator) Next() bool {
	return it.rows.Next()
}

func (it *sqliteRowIterator) Scan(dest ...interface{}) error {
	return it.rows.Scan(dest...)
}

func (it *sqliteRowIterator) Close() error {
	return it.rows.Close()
}

type sqliteTransaction struct {
	tx *sql.Tx
}

func (t *sqliteTransaction) Exec(query string, args ...interface{}) error {
	_, err := t.tx.Exec(query, args...)
	return err
}

func (t *sqliteTransaction) Commit() error {
	return t.tx.Commit()
}

func (t *sqliteTransaction) Rollback() error {
	return t.tx.Rollback()
}

// ═══════════════════════════════════════
// 🍃 MONGODB IMPLEMENTATION
// ═══════════════════════════════════════

type mongoHelper struct {
	db *mongo.Database
}

func (h *mongoHelper) QueryRow(query string, args ...interface{}) RowScanner {
	return h.QueryRowContext(context.Background(), query, args...)
}

func (h *mongoHelper) Query(query string, args ...interface{}) (RowIterator, error) {
	return h.QueryContext(context.Background(), query, args...)
}

func (h *mongoHelper) Exec(query string, args ...interface{}) error {
	return h.ExecContext(context.Background(), query, args...)
}

func (h *mongoHelper) QueryContext(ctx context.Context, query string, args ...interface{}) (RowIterator, error) {
	rows, err := executeMongoQuery(ctx, h.db, query, args)
	if err != nil {
		return nil, err
	}
	return rows, nil
}

func (h *mongoHelper) ExecContext(ctx context.Context, query string, args ...interface{}) error {
	_, err := executeMongoQuery(ctx, h.db, query, args)
	return err
}

func (h *mongoHelper) QueryRowContext(ctx context.Context, query string, args ...interface{}) RowScanner {
	rows, err := executeMongoQuery(ctx, h.db, query, args)
	if err != nil {
		return &mongoRowScanner{err: err}
	}
	return &mongoRowScanner{rows: rows}
}

func (h *mongoHelper) Begin() (Transaction, error) {
	return &mongoTransaction{}, nil
}

// ═══════════════════════════════════════
// 🔄 MONGODB QUERY EXECUTOR
// ═══════════════════════════════════════

// executeMongoQuery executes a SQL-like query against MongoDB
// This is a compatibility layer for simple queries
func executeMongoQuery(ctx context.Context, db *mongo.Database, query string, args []interface{}) (*mongoRows, error) {
	// Parse the query to extract collection name and operation type
	collection, op := extractCollectionAndOp(query)
	if collection == "" {
		return nil, fmt.Errorf("could not parse collection from query: %s", query)
	}

	coll := db.Collection(collection)

	switch op {
	case "SELECT":
		return execMongoFind(ctx, coll, query, args)
	case "INSERT":
		return execMongoInsert(ctx, coll, query, args)
	case "UPDATE":
		return execMongoUpdate(ctx, coll, query, args)
	case "DELETE":
		return execMongoDelete(ctx, coll, query, args)
	default:
		return nil, fmt.Errorf("unsupported operation in query: %s", query)
	}
}

func extractCollectionAndOp(query string) (string, string) {
	// Simple extraction of collection name from SQL-like queries
	// Handles patterns like:
	// SELECT ... FROM collection ...
	// INSERT INTO collection ...
	// UPDATE collection ...
	// DELETE FROM collection ...

	// Make uppercase for matching
	upperStr := ""

	for _, c := range query {
		if c >= 'a' && c <= 'z' {
			upperStr += string(c - 32)
		} else {
			upperStr += string(c)
		}
	}

	// Try SELECT ... FROM collection
	if idx := indexOf(upperStr, "FROM "); idx >= 0 {
		rest := upperStr[idx+5:]
		// Skip whitespace
		start := 0
		for start < len(rest) && (rest[start] == ' ' || rest[start] == '\t' || rest[start] == '\n') {
			start++
		}
		// Read collection name (alphanumeric + underscore)
		end := start
		for end < len(rest) && isIdentChar(rest[end]) {
			end++
		}
		if end > start {
			return rest[start:end], "SELECT"
		}
	}

	// Try INSERT INTO collection
	if idx := indexOf(upperStr, "INSERT INTO "); idx >= 0 {
		rest := upperStr[idx+12:]
		start := 0
		for start < len(rest) && (rest[start] == ' ' || rest[start] == '\t' || rest[start] == '\n') {
			start++
		}
		end := start
		for end < len(rest) && isIdentChar(rest[end]) {
			end++
		}
		if end > start {
			return rest[start:end], "INSERT"
		}
	}

	// Try UPDATE collection
	if indexOf(upperStr, "UPDATE ") == 0 {
		rest := upperStr[7:]
		start := 0
		for start < len(rest) && (rest[start] == ' ' || rest[start] == '\t' || rest[start] == '\n') {
			start++
		}
		end := start
		for end < len(rest) && isIdentChar(rest[end]) {
			end++
		}
		if end > start {
			return rest[start:end], "UPDATE"
		}
	}

	// Try DELETE FROM collection
	if idx := indexOf(upperStr, "DELETE FROM "); idx >= 0 {
		rest := upperStr[idx+12:]
		start := 0
		for start < len(rest) && (rest[start] == ' ' || rest[start] == '\t' || rest[start] == '\n') {
			start++
		}
		end := start
		for end < len(rest) && isIdentChar(rest[end]) {
			end++
		}
		if end > start {
			return rest[start:end], "DELETE"
		}
	}

	return "", ""
}

func indexOf(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		match := true
		for j := 0; j < len(substr); j++ {
			if s[i+j] != substr[j] {
				match = false
				break
			}
		}
		if match {
			return i
		}
	}
	return -1
}

func isIdentChar(c byte) bool {
	return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '_'
}

func execMongoFind(ctx context.Context, coll *mongo.Collection, query string, args []interface{}) (*mongoRows, error) {
	filter := bson.M{}
	cursor, err := coll.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	var results []bson.M
	if err := cursor.All(ctx, &results); err != nil {
		return nil, err
	}
	return &mongoRows{results: results, current: -1}, nil
}

func execMongoInsert(ctx context.Context, coll *mongo.Collection, query string, args []interface{}) (*mongoRows, error) {
	doc := bson.M{}
	if len(args) > 0 {
		// If first arg is a map, use it directly
		if m, ok := args[0].(map[string]interface{}); ok {
			for k, v := range m {
				doc[k] = v
			}
		}
	}
	_, err := coll.InsertOne(ctx, doc)
	if err != nil {
		return nil, err
	}
	return &mongoRows{}, nil
}

func execMongoUpdate(ctx context.Context, coll *mongo.Collection, query string, args []interface{}) (*mongoRows, error) {
	filter := bson.M{}
	update := bson.M{"$set": bson.M{}}
	_, err := coll.UpdateMany(ctx, filter, update)
	if err != nil {
		return nil, err
	}
	return &mongoRows{}, nil
}

func execMongoDelete(ctx context.Context, coll *mongo.Collection, query string, args []interface{}) (*mongoRows, error) {
	filter := bson.M{}
	_, err := coll.DeleteMany(ctx, filter)
	if err != nil {
		return nil, err
	}
	return &mongoRows{}, nil
}

// ═══════════════════════════════════════
// 📊 MONGODB ROW TYPES
// ═══════════════════════════════════════

type mongoRows struct {
	results []bson.M
	current int
}

func (r *mongoRows) Next() bool {
	r.current++
	return r.current < len(r.results)
}

func (r *mongoRows) Scan(dest ...interface{}) error {
	if r.current < 0 || r.current >= len(r.results) {
		return fmt.Errorf("no more rows")
	}
	row := r.results[r.current]
	for i, d := range dest {
		if ptr, ok := d.(*interface{}); ok {
			// Get the value by index or key
			keys := getKeys(row)
			if i < len(keys) {
				*ptr = row[keys[i]]
			}
		}
	}
	return nil
}

func (r *mongoRows) Close() error {
	return nil
}

func getKeys(m bson.M) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

type mongoRowScanner struct {
	rows *mongoRows
	err  error
}

func (s *mongoRowScanner) Scan(dest ...interface{}) error {
	if s.err != nil {
		return s.err
	}
	if s.rows == nil || !s.rows.Next() {
		return fmt.Errorf("no rows in result set")
	}
	return s.rows.Scan(dest...)
}

type mongoTransaction struct{}

func (t *mongoTransaction) Exec(query string, args ...interface{}) error {
	return nil
}

func (t *mongoTransaction) Commit() error {
	return nil
}

func (t *mongoTransaction) Rollback() error {
	return nil
}

// ═══════════════════════════════════════
// 🏭 FACTORY
// ═══════════════════════════════════════

// GetDBHelper returns the appropriate DBHelper based on the current configuration
func GetDBHelper() DBHelper {
	if UseMongoDB {
		if MongoDatabase != nil {
			return &mongoHelper{db: MongoDatabase}
		}
		log.Println("⚠️ MongoDB not connected, falling back to SQLite")
	}
	if DB != nil {
		return &sqliteHelper{db: DB}
	}
	return nil
}

// UseMongoDB indicates whether MongoDB is being used
var UseMongoDB bool
