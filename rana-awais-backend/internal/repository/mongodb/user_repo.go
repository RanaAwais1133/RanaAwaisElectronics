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

type UserRepository struct {
	coll *mongo.Collection
}

func NewUserRepository(db *mongo.Database) *UserRepository {
	return &UserRepository{
		coll: db.Collection("users"),
	}
}

func (r *UserRepository) Create(ctx context.Context, u *domain.User) error {
	if u.ID == "" {
		u.ID = primitive.NewObjectID().Hex()
	}
	u.CreatedAt = time.Now()
	u.UpdatedAt = time.Now()

	_, err := r.coll.InsertOne(ctx, u)
	return err
}

func (r *UserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	var u domain.User
	err := r.coll.FindOne(ctx, getFilterByID(id)).Decode(&u)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) GetByUsername(ctx context.Context, username string) (*domain.User, error) {
	var u domain.User
	err := r.coll.FindOne(ctx, bson.M{"username": username}).Decode(&u)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepository) Update(ctx context.Context, id string, u *domain.User) error {
	u.UpdatedAt = time.Now()
	_, err := r.coll.ReplaceOne(ctx, getFilterByID(id), u)
	return err
}

func (r *UserRepository) Delete(ctx context.Context, id string) error {
	_, err := r.coll.DeleteOne(ctx, getFilterByID(id))
	return err
}


func (r *UserRepository) List(ctx context.Context, skip, limit int64) ([]domain.User, error) {
	opts := options.Find().
		SetSkip(skip).
		SetLimit(limit).
		SetSort(bson.D{{Key: "createdat", Value: -1}})
	cursor, err := r.coll.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []domain.User
	err = cursor.All(ctx, &users)
	if err != nil {
		return nil, err
	}
	if users == nil {
		users = []domain.User{}
	}
	return users, nil
}

func (r *UserRepository) Count(ctx context.Context) (int64, error) {
	return r.coll.CountDocuments(ctx, bson.M{})
}
