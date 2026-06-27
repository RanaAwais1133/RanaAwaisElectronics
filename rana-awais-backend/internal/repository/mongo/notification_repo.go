package mongo

import (
	"context"
	"time"

	"github.com/your-org/rana-awais-backend/config"
	"github.com/your-org/rana-awais-backend/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type NotificationRepository struct {
	coll *mongo.Collection
}

func NewNotificationRepository() *NotificationRepository {
	return &NotificationRepository{
		coll: config.DB.Collection("notifications"),
	}
}

func (r *NotificationRepository) Create(ctx context.Context, n *domain.Notification) error {
	n.ID = primitive.NewObjectID()
	n.CreatedAt = time.Now()
	_, err := r.coll.InsertOne(ctx, n)
	return err
}

func (r *NotificationRepository) GetByCustomer(ctx context.Context, customerID primitive.ObjectID) ([]domain.Notification, error) {
	filter := bson.M{"customer_id": customerID}
	cursor, err := r.coll.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var notifs []domain.Notification
	if err = cursor.All(ctx, &notifs); err != nil {
		return nil, err
	}
	return notifs, nil
}

func (r *NotificationRepository) UpdateStatus(ctx context.Context, id primitive.ObjectID, status string) error {
	_, err := r.coll.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": bson.M{"status": status}})
	return err
}