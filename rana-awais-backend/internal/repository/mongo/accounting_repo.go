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

type AccountingRepository struct {
	coll     *mongo.Collection
	invColl  *mongo.Collection
}

func NewAccountingRepository() *AccountingRepository {
	return &AccountingRepository{
		coll:    config.DB.Collection("accounting"),
		invColl: config.DB.Collection("inventory"),
	}
}

func (r *AccountingRepository) Create(ctx context.Context, e *domain.AccountingEntry) error {
	e.ID = primitive.NewObjectID()
	e.CreatedAt = time.Now()
	_, err := r.coll.InsertOne(ctx, e)
	return err
}

func (r *AccountingRepository) GetCashFlowReport(ctx context.Context, start, end time.Time) ([]domain.AccountingEntry, error) {
	filter := bson.M{
		"basis": "cash_flow",
		"date": bson.M{
			"$gte": start,
			"$lte": end,
		},
	}
	cursor, err := r.coll.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var entries []domain.AccountingEntry
	if err = cursor.All(ctx, &entries); err != nil {
		return nil, err
	}
	if entries == nil {
		entries = []domain.AccountingEntry{}
	}
	return entries, nil
}

func (r *AccountingRepository) GetAccrualReport(ctx context.Context, start, end time.Time) ([]domain.AccountingEntry, error) {
	filter := bson.M{
		"basis": "accrual",
		"date": bson.M{
			"$gte": start,
			"$lte": end,
		},
	}
	cursor, err := r.coll.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var entries []domain.AccountingEntry
	if err = cursor.All(ctx, &entries); err != nil {
		return nil, err
	}
	if entries == nil {
		entries = []domain.AccountingEntry{}
	}
	return entries, nil
}

// GetSoldItems returns inventory items sold within the date range
func (r *AccountingRepository) GetSoldItems(ctx context.Context, start, end time.Time) ([]domain.InventoryItem, error) {
	filter := bson.M{
		"status": "sold",
		"sold_date": bson.M{
			"$gte": start,
			"$lte": end,
		},
	}
	cursor, err := r.invColl.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var items []domain.InventoryItem
	if err = cursor.All(ctx, &items); err != nil {
		return nil, err
	}
	if items == nil {
		items = []domain.InventoryItem{}
	}
	return items, nil
}