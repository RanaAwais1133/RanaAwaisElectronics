package sqlite

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository"
)


// SyncLogRepository implements repository.SyncLogRepository for SQLite
type SyncLogRepository struct {
	db *sql.DB
}

// NewSyncLogRepository creates a new SQLite sync log repository
func NewSyncLogRepository(db *sql.DB) *SyncLogRepository {
	return &SyncLogRepository{db: db}
}

// InitSyncSchema creates the sync_logs table if it doesn't exist
func InitSyncSchema(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS sync_logs (
			id TEXT PRIMARY KEY,
			entity TEXT NOT NULL,
			entity_id TEXT NOT NULL,
			operation TEXT NOT NULL,
			data TEXT,
			status TEXT NOT NULL DEFAULT 'pending',
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			synced_at DATETIME,
			error TEXT,
			retry_count INTEGER NOT NULL DEFAULT 0,
			last_attempt DATETIME
		);
		CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
		CREATE INDEX IF NOT EXISTS idx_sync_logs_entity ON sync_logs(entity, entity_id);
	`)
	return err
}

func (r *SyncLogRepository) CreateSyncRecord(ctx context.Context, record repository.SyncRecord) error {
	dataJSON := "{}"
	if record.Data != nil {
		d, err := json.Marshal(record.Data)
		if err == nil {
			dataJSON = string(d)
		}
	}

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO sync_logs (id, entity, entity_id, operation, data, status, created_at, retry_count)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		record.ID, record.Entity, record.EntityID, record.Operation, dataJSON,
		record.Status, record.CreatedAt, record.RetryCount,
	)
	return err
}

func (r *SyncLogRepository) UpdateSyncRecord(ctx context.Context, record repository.SyncRecord) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE sync_logs
		SET status = ?, synced_at = ?, error = ?, retry_count = ?, last_attempt = ?
		WHERE id = ?`,
		record.Status, record.SyncedAt, record.Error, record.RetryCount, record.LastAttempt,
		record.ID,
	)
	return err
}

func (r *SyncLogRepository) GetPendingSyncRecords(ctx context.Context) ([]repository.SyncRecord, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, entity, entity_id, operation, data, status, created_at, synced_at, error, retry_count, last_attempt
		FROM sync_logs
		WHERE status = 'pending' OR (status = 'failed' AND retry_count < 5)
		ORDER BY created_at ASC
		LIMIT 100`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []repository.SyncRecord
	for rows.Next() {
		var r repository.SyncRecord
		var dataStr sql.NullString
		var syncedAt, lastAttempt sql.NullTime

		err := rows.Scan(&r.ID, &r.Entity, &r.EntityID, &r.Operation, &dataStr,
			&r.Status, &r.CreatedAt, &syncedAt, &r.Error, &r.RetryCount, &lastAttempt)
		if err != nil {
			return nil, err
		}

		if syncedAt.Valid {
			r.SyncedAt = &syncedAt.Time
		}
		if lastAttempt.Valid {
			r.LastAttempt = &lastAttempt.Time
		}
		if dataStr.Valid && dataStr.String != "" {
			json.Unmarshal([]byte(dataStr.String), &r.Data)
		}

		records = append(records, r)
	}

	return records, nil
}

func (r *SyncLogRepository) GetSyncRecord(ctx context.Context, entity, entityID string) (*repository.SyncRecord, error) {
	var rec repository.SyncRecord
	var dataStr sql.NullString
	var syncedAt, lastAttempt sql.NullTime

	err := r.db.QueryRowContext(ctx, `
		SELECT id, entity, entity_id, operation, data, status, created_at, synced_at, error, retry_count, last_attempt
		FROM sync_logs
		WHERE entity = ? AND entity_id = ?
		ORDER BY created_at DESC LIMIT 1`, entity, entityID).Scan(
		&rec.ID, &rec.Entity, &rec.EntityID, &rec.Operation, &dataStr,
		&rec.Status, &rec.CreatedAt, &syncedAt, &rec.Error, &rec.RetryCount, &lastAttempt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if syncedAt.Valid {
		rec.SyncedAt = &syncedAt.Time
	}
	if lastAttempt.Valid {
		rec.LastAttempt = &lastAttempt.Time
	}
	if dataStr.Valid && dataStr.String != "" {
		json.Unmarshal([]byte(dataStr.String), &rec.Data)
	}

	return &rec, nil
}

func (r *SyncLogRepository) GetSyncStatus(ctx context.Context) (map[string]interface{}, error) {
	var pending, synced, failed int64

	r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM sync_logs WHERE status = 'pending'`).Scan(&pending)
	r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM sync_logs WHERE status = 'synced'`).Scan(&synced)
	r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM sync_logs WHERE status = 'failed'`).Scan(&failed)

	// Get last sync time
	var lastSync sql.NullTime
	r.db.QueryRowContext(ctx, `SELECT MAX(synced_at) FROM sync_logs WHERE status = 'synced'`).Scan(&lastSync)

	result := map[string]interface{}{
		"pending": pending,
		"synced":  synced,
		"failed":  failed,
		"total":   pending + synced + failed,
	}

	if lastSync.Valid {
		result["last_sync"] = lastSync.Time
	}

	return result, nil
}
