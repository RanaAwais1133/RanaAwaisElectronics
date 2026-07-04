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
// Profit is calculated proportionally: for each payment, profit = (selling_price - purchase_price) / num_installments
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

	// If revenue is 0, profit must also be 0
	if revenue == 0 {
		return 0, 0, nil
	}

	// Calculate proportional profit from payments linked to installment plans and inventory items
	// For each payment, find the linked installment plan and inventory item
	// Profit per installment = (selling_price - purchase_price) / num_installments
	profitPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"transaction_date": bson.M{
				"$gte": start,
				"$lte": end,
			},
		}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColInstallments,
			"localField":   "installment_plan_id",
			"foreignField": "_id",
			"as":           "plan",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$plan", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         config.ColInventory,
			"localField":   "plan.inventory_item_id",
			"foreignField": "_id",
			"as":           "inventory",
		}}},
		{{Key: "$unwind", Value: bson.M{"path": "$inventory", "preserveNullAndEmptyArrays": true}}},
		{{Key: "$group", Value: bson.M{
			"_id": nil,
			"totalRevenue": bson.M{"$sum": "$amount"},
			"totalProfit": bson.M{"$sum": bson.M{
				"$cond": bson.A{
					bson.M{"$and": bson.A{
						bson.M{"$gt": bson.A{bson.M{"$ifNull": bson.A{"$inventory.selling_price", 0}}, 0}},
						bson.M{"$gt": bson.A{bson.M{"$ifNull": bson.A{"$inventory.purchase_price", 0}}, 0}},
						bson.M{"$gt": bson.A{bson.M{"$ifNull": bson.A{"$plan.num_installments", 1}}, 0}},
					}},
					// Proportional profit = (selling_price - purchase_price) / num_installments
					bson.M{"$divide": bson.A{
						bson.M{"$subtract": bson.A{
							bson.M{"$ifNull": bson.A{"$inventory.selling_price", 0}},
							bson.M{"$ifNull": bson.A{"$inventory.purchase_price", 0}},
						}},
						bson.M{"$ifNull": bson.A{"$plan.num_installments", 1}},
					}},
					// Fallback: 10% of payment as estimated profit
					bson.M{"$multiply": bson.A{"$amount", 0.10}},
				},
			}},
		}}},
	}
	profitCursor, err := r.payColl.Aggregate(ctx, profitPipeline)
	if err != nil {
		// If can't get profit data, return revenue with 0 profit
		return revenue, 0, nil
	}
	defer profitCursor.Close(ctx)

	var profitResults []struct {
		TotalRevenue float64 `bson:"totalRevenue"`
		TotalProfit  float64 `bson:"totalProfit"`
	}
	if profitCursor.All(ctx, &profitResults) == nil && len(profitResults) > 0 {
		profit = profitResults[0].TotalProfit
	}

	// Profit cannot exceed revenue
	if profit > revenue {
		profit = revenue
	}
	if profit < 0 {
		profit = 0
	}

	return revenue, profit, nil
}
