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

type NotificationRepository struct {
	coll *mongo.Collection
}

func NewNotificationRepository(db *mongo.Database) *NotificationRepository {
	return &NotificationRepository{
		coll: db.Collection("notifications"),
	}
}

func (r *NotificationRepository) Create(ctx context.Context, n *domain.Notification) error {
	if n.ID == "" {
		n.ID = primitive.NewObjectID().Hex()
	}
	n.CreatedAt = time.Now()

	_, err := r.coll.InsertOne(ctx, n)
	return err
}

func (r *NotificationRepository) GetByID(ctx context.Context, id string) (*domain.Notification, error) {
	var n domain.Notification
	err := r.coll.FindOne(ctx, getFilterByID(id)).Decode(&n)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &n, nil
}

func (r *NotificationRepository) ListPending(ctx context.Context) ([]domain.Notification, error) {
	cursor, err := r.coll.Find(ctx, bson.M{"status": "pending"}, options.Find().SetSort(bson.D{{Key: "createdat", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var notifications []domain.Notification
	err = cursor.All(ctx, &notifications)
	if err != nil {
		return nil, err
	}
	if notifications == nil {
		notifications = []domain.Notification{}
	}
	return notifications, nil
}

func (r *NotificationRepository) MarkAsSent(ctx context.Context, id string) error {
	_, err := r.coll.UpdateOne(ctx, getFilterByID(id), bson.M{"$set": bson.M{"status": "sent", "sentat": time.Now()}})
	return err
}

func (r *NotificationRepository) GetByCustomer(ctx context.Context, customerID string) ([]domain.Notification, error) {
	cursor, err := r.coll.Find(ctx, bson.M{"customerid": customerID}, options.Find().SetSort(bson.D{{Key: "createdat", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var notifications []domain.Notification
	err = cursor.All(ctx, &notifications)
	if err != nil {
		return nil, err
	}
	if notifications == nil {
		notifications = []domain.Notification{}
	}
	return notifications, nil
}

func (r *NotificationRepository) UpdateStatus(ctx context.Context, id string, status string) error {
	_, err := r.coll.UpdateOne(ctx, getFilterByID(id), bson.M{"$set": bson.M{"status": status}})
	return err
}

func (r *NotificationRepository) Delete(ctx context.Context, id string) error {
	_, err := r.coll.DeleteOne(ctx, getFilterByID(id))
	return err
}



