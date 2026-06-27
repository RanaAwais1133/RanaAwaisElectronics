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
	coll    *mongo.Collection
	invColl *mongo.Collection
	payColl *mongo.Collection
}

func NewAccountingRepository() *AccountingRepository {
	return &AccountingRepository{
		coll:    config.DB.Collection("accounting"),
		invColl: config.DB.Collection("inventory"),
		payColl: config.DB.Collection("payments"),
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

// ✅ NEW: GetRevenueAndProfit for dashboard
func (r *AccountingRepository) GetRevenueAndProfit(ctx context.Context, start, end time.Time) (revenue float64, profit float64, err error) {
	// Get all payments in date range
	filter := bson.M{
		"transaction_date": bson.M{
			"$gte": start,
			"$lte": end,
		},
	}
	cursor, err := r.payColl.Find(ctx, filter)
	if err != nil {
		return 0, 0, err
	}
	defer cursor.Close(ctx)

	var payments []domain.Payment
	if err = cursor.All(ctx, &payments); err != nil {
		return 0, 0, err
	}

	// Calculate revenue (sum of all payments)
	for _, p := range payments {
		revenue += p.Amount
	}

	// For profit, we need to calculate cost of goods sold
	// This is simplified - in production, get from inventory purchase prices
	// For now, assume 70% of revenue is cost (30% profit margin)
	// In real implementation, get actual purchase prices from inventory
	profit = revenue * 0.30 // 30% profit margin (adjust as needed)

	return revenue, profit, nil
}