package mongodb

import (
	"context"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ExpenseRepository handles expense CRUD operations in MongoDB
type ExpenseRepository struct {
	coll *mongo.Collection
}

// NewExpenseRepository creates a new MongoDB expense repository
func NewExpenseRepository(db *mongo.Database) *ExpenseRepository {
	return &ExpenseRepository{
		coll: db.Collection("expenses"),
	}
}

// Create inserts a new expense
func (r *ExpenseRepository) Create(ctx context.Context, e *domain.Expense) error {
	if e.ID == "" {
		e.ID = primitive.NewObjectID().Hex()
	}
	e.CreatedAt = time.Now()
	_, err := r.coll.InsertOne(ctx, e)
	return err
}

// GetByID retrieves an expense by ID
func (r *ExpenseRepository) GetByID(ctx context.Context, id string) (*domain.Expense, error) {
	var expense domain.Expense
	err := r.coll.FindOne(ctx, getFilterByID(id)).Decode(&expense)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &expense, nil
}

// Update updates an existing expense
func (r *ExpenseRepository) Update(ctx context.Context, id string, e *domain.Expense) error {
	_, err := r.coll.UpdateOne(ctx,
		getFilterByID(id),
		bson.M{"$set": bson.M{
			"description":      e.Description,
			"description_urdu": e.DescriptionUrdu,
			"amount":           e.Amount,
			"category":         e.Category,
			"date":             e.Date,
			"paid_by":          e.PaidBy,
			"notes":            e.Notes,
		}},
	)
	return err
}

// Delete removes an expense by ID
func (r *ExpenseRepository) Delete(ctx context.Context, id string) error {
	_, err := r.coll.DeleteOne(ctx, getFilterByID(id))
	return err
}


// List returns expenses with pagination
func (r *ExpenseRepository) List(ctx context.Context, skip, limit int64) ([]domain.Expense, error) {
	opts := options.Find().
		SetSkip(skip).
		SetLimit(limit).
		SetSort(bson.D{{Key: "date", Value: -1}, {Key: "created_at", Value: -1}})

	cursor, err := r.coll.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var expenses []domain.Expense
	if err := cursor.All(ctx, &expenses); err != nil {
		return nil, err
	}
	if expenses == nil {
		expenses = []domain.Expense{}
	}
	return expenses, nil
}

// Count returns total number of expenses
func (r *ExpenseRepository) Count(ctx context.Context) (int64, error) {
	return r.coll.CountDocuments(ctx, bson.M{})
}
