package mongodb

import (
	"context"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/repository"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// SyncLogRepository implements repository.SyncLogRepository for MongoDB
type SyncLogRepository struct {
	coll *mongo.Collection
}

// NewSyncLogRepository creates a new MongoDB sync log repository
func NewSyncLogRepository(db *mongo.Database) *SyncLogRepository {
	return &SyncLogRepository{
		coll: db.Collection("sync_logs"),
	}
}

func (r *SyncLogRepository) CreateSyncRecord(ctx context.Context, record repository.SyncRecord) error {
	doc := bson.M{
		"_id":         record.ID,
		"entity":      record.Entity,
		"entity_id":   record.EntityID,
		"operation":   record.Operation,
		"data":        record.Data,
		"status":      record.Status,
		"created_at":  record.CreatedAt,
		"synced_at":   record.SyncedAt,
		"error":       record.Error,
		"retry_count": record.RetryCount,
		"last_attempt": record.LastAttempt,
	}
	_, err := r.coll.InsertOne(ctx, doc)
	return err
}

func (r *SyncLogRepository) UpdateSyncRecord(ctx context.Context, record repository.SyncRecord) error {
	_, err := r.coll.UpdateOne(ctx,
		bson.M{"_id": record.ID},
		bson.M{"$set": bson.M{
			"status":       record.Status,
			"synced_at":    record.SyncedAt,
			"error":        record.Error,
			"retry_count":  record.RetryCount,
			"last_attempt": record.LastAttempt,
		}},
	)
	return err
}

func (r *SyncLogRepository) GetPendingSyncRecords(ctx context.Context) ([]repository.SyncRecord, error) {
	cursor, err := r.coll.Find(ctx, bson.M{
		"$or": []bson.M{
			{"status": "pending"},
			{"status": "failed", "retry_count": bson.M{"$lt": 5}},
		},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var records []repository.SyncRecord
	for cursor.Next(ctx) {
		var doc struct {
			ID          string                 `bson:"_id"`
			Entity      string                 `bson:"entity"`
			EntityID    string                 `bson:"entity_id"`
			Operation   string                 `bson:"operation"`
			Data        map[string]interface{} `bson:"data,omitempty"`
			Status      string                 `bson:"status"`
			CreatedAt   time.Time              `bson:"created_at"`
			SyncedAt    *time.Time             `bson:"synced_at,omitempty"`
			Error       string                 `bson:"error,omitempty"`
			RetryCount  int                    `bson:"retry_count"`
			LastAttempt *time.Time             `bson:"last_attempt,omitempty"`
		}
		if err := cursor.Decode(&doc); err != nil {
			continue
		}
		records = append(records, repository.SyncRecord{
			ID:          doc.ID,
			Entity:      doc.Entity,
			EntityID:    doc.EntityID,
			Operation:   doc.Operation,
			Data:        doc.Data,
			Status:      doc.Status,
			CreatedAt:   doc.CreatedAt,
			SyncedAt:    doc.SyncedAt,
			Error:       doc.Error,
			RetryCount:  doc.RetryCount,
			LastAttempt: doc.LastAttempt,
		})
	}
	return records, nil
}

func (r *SyncLogRepository) GetSyncRecord(ctx context.Context, entity, entityID string) (*repository.SyncRecord, error) {
	var doc struct {
		ID          string                 `bson:"_id"`
		Entity      string                 `bson:"entity"`
		EntityID    string                 `bson:"entity_id"`
		Operation   string                 `bson:"operation"`
		Data        map[string]interface{} `bson:"data,omitempty"`
		Status      string                 `bson:"status"`
		CreatedAt   time.Time              `bson:"created_at"`
		SyncedAt    *time.Time             `bson:"synced_at,omitempty"`
		Error       string                 `bson:"error,omitempty"`
		RetryCount  int                    `bson:"retry_count"`
		LastAttempt *time.Time             `bson:"last_attempt,omitempty"`
	}

	err := r.coll.FindOne(ctx, bson.M{"entity": entity, "entity_id": entityID}).Decode(&doc)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &repository.SyncRecord{
		ID:          doc.ID,
		Entity:      doc.Entity,
		EntityID:    doc.EntityID,
		Operation:   doc.Operation,
		Data:        doc.Data,
		Status:      doc.Status,
		CreatedAt:   doc.CreatedAt,
		SyncedAt:    doc.SyncedAt,
		Error:       doc.Error,
		RetryCount:  doc.RetryCount,
		LastAttempt: doc.LastAttempt,
	}, nil
}

func (r *SyncLogRepository) GetSyncStatus(ctx context.Context) (map[string]interface{}, error) {
	pending, _ := r.coll.CountDocuments(ctx, bson.M{"status": "pending"})
	synced, _ := r.coll.CountDocuments(ctx, bson.M{"status": "synced"})
	failed, _ := r.coll.CountDocuments(ctx, bson.M{"status": "failed"})

	result := map[string]interface{}{
		"pending": pending,
		"synced":  synced,
		"failed":  failed,
		"total":   pending + synced + failed,
	}

	// Get last sync time
	var lastDoc struct {
		SyncedAt *time.Time `bson:"synced_at"`
	}
	err := r.coll.FindOne(ctx, bson.M{"status": "synced"}, nil).Decode(&lastDoc)
	if err == nil && lastDoc.SyncedAt != nil {
		result["last_sync"] = *lastDoc.SyncedAt
	}

	return result, nil
}
