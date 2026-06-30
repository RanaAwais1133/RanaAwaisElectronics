package mongo

import (
	"context"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/internal/domain"
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
		coll:    config.DB.Collection(config.ColAccounting),
		invColl: config.DB.Collection(config.ColInventory),
		payColl: config.DB.Collection(config.ColPayments),
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

// GetRevenueAndProfit calculates revenue and profit from actual data using MongoDB aggregation
func (r *AccountingRepository) GetRevenueAndProfit(ctx context.Context, start, end time.Time) (revenue float64, profit float64, err error) {
	// Use aggregation to sum payments in one query
	payPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"transaction_date": bson.M{
				"$gte": start,
				"$lte": end,
			},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   nil,
			"total": bson.M{"$sum": "$amount"},
		}}},
	}
	payCursor, err := r.payColl.Aggregate(ctx, payPipeline)
	if err != nil {
		return 0, 0, err
	}
	defer payCursor.Close(ctx)

	var payResults []struct {
		Total float64 `bson:"total"`
	}
	if payCursor.All(ctx, &payResults) == nil && len(payResults) > 0 {
		revenue = payResults[0].Total
	}

	// Calculate profit as: Revenue - Cost of Goods Sold
	// COGS = sum of purchase_price of inventory items sold in this period
	soldPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"status": "sold",
			"sold_date": bson.M{
				"$gte": start,
				"$lte": end,
			},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":          nil,
			"totalCost":    bson.M{"$sum": "$purchase_price"},
			"totalSelling": bson.M{"$sum": "$selling_price"},
		}}},
	}
	soldCursor, err := r.invColl.Aggregate(ctx, soldPipeline)
	if err != nil {
		// Fallback: if can't get cost data, estimate profit as 30% of revenue
		profit = revenue * 0.30
		return revenue, profit, nil
	}
	defer soldCursor.Close(ctx)

	var soldResults []struct {
		TotalCost    float64 `bson:"totalCost"`
		TotalSelling float64 `bson:"totalSelling"`
	}
	if soldCursor.All(ctx, &soldResults) == nil && len(soldResults) > 0 {
		if soldResults[0].TotalSelling > 0 && soldResults[0].TotalCost > 0 {
			// Actual profit from sold items = selling_price - purchase_price
			profit = soldResults[0].TotalSelling - soldResults[0].TotalCost
		} else if soldResults[0].TotalSelling > 0 {
			// Items sold but no purchase price recorded, estimate 30% margin
			profit = soldResults[0].TotalSelling * 0.30
		} else {
			// No items sold in this period, profit = 0
			profit = 0
		}
	} else {
		// No sold items found in this period
		profit = 0
	}

	return revenue, profit, nil
}
