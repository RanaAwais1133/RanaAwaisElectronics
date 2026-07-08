package mongodb

import (
	"context"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// SettingsRepository handles settings and license operations in MongoDB
type SettingsRepository struct {
	settingsColl *mongo.Collection
	licenseColl  *mongo.Collection
	auditColl    *mongo.Collection
}

// NewSettingsRepository creates a new MongoDB settings repository
func NewSettingsRepository(db *mongo.Database) *SettingsRepository {
	return &SettingsRepository{
		settingsColl: db.Collection("settings"),
		licenseColl:  db.Collection("license"),
		auditColl:    db.Collection("audit_logs"),
	}
}

// ========== SETTINGS ==========

// GetSetting retrieves a setting by key
func (r *SettingsRepository) GetSetting(ctx context.Context, key string) (string, error) {
	var setting domain.Setting
	err := r.settingsColl.FindOne(ctx, bson.M{"key": key}).Decode(&setting)
	if err == mongo.ErrNoDocuments {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return setting.Value, nil
}

// SetSetting saves or updates a setting
func (r *SettingsRepository) SetSetting(ctx context.Context, key, value string) error {
	opts := options.Update().SetUpsert(true)
	_, err := r.settingsColl.UpdateOne(ctx,
		bson.M{"key": key},
		bson.M{"$set": bson.M{"key": key, "value": value, "updated_at": time.Now()}},
		opts,
	)
	return err
}

// GetAllSettings returns all settings as a map
func (r *SettingsRepository) GetAllSettings(ctx context.Context) (map[string]string, error) {
	cursor, err := r.settingsColl.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	settings := make(map[string]string)
	for cursor.Next(ctx) {
		var s domain.Setting
		if err := cursor.Decode(&s); err != nil {
			continue
		}
		settings[s.Key] = s.Value
	}
	return settings, nil
}

// ========== LICENSE ==========

// GetLicenseStatus checks if a license is active
func (r *SettingsRepository) GetLicenseStatus(ctx context.Context, licenseKey string) (bool, error) {
	var license domain.License
	err := r.licenseColl.FindOne(ctx, bson.M{"license_key": licenseKey, "is_active": 1}).Decode(&license)
	if err == mongo.ErrNoDocuments {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

// CreateLicense inserts a new license record
func (r *SettingsRepository) CreateLicense(ctx context.Context, license *domain.License) error {
	license.CreatedAt = time.Now()
	_, err := r.licenseColl.InsertOne(ctx, license)
	return err
}

// CountLicenses counts licenses matching filter
func (r *SettingsRepository) CountLicenses(ctx context.Context, filter bson.M) (int64, error) {
	return r.licenseColl.CountDocuments(ctx, filter)
}

// ========== AUDIT LOGS ==========

// InsertAuditLog inserts an audit log entry
func (r *SettingsRepository) InsertAuditLog(ctx context.Context, log domain.AuditLog) error {
	_, err := r.auditColl.InsertOne(ctx, log)
	return err
}

// GetAuditLogs returns audit logs with pagination
func (r *SettingsRepository) GetAuditLogs(ctx context.Context, skip, limit int64) ([]domain.AuditLog, int64, error) {
	total, err := r.auditColl.CountDocuments(ctx, bson.M{})
	if err != nil {
		return nil, 0, err
	}

	opts := options.Find().
		SetSkip(skip).
		SetLimit(limit).
		SetSort(bson.D{{Key: "timestamp", Value: -1}})

	cursor, err := r.auditColl.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var logs []domain.AuditLog
	if err := cursor.All(ctx, &logs); err != nil {
		return nil, 0, err
	}
	if logs == nil {
		logs = []domain.AuditLog{}
	}
	return logs, total, nil
}
