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

type AccountingRepository struct {
	coll          *mongo.Collection
	paymentsColl  *mongo.Collection
	plansColl     *mongo.Collection
	productsColl  *mongo.Collection
	inventoryColl *mongo.Collection
}

func NewAccountingRepository(db *mongo.Database) *AccountingRepository {
	return &AccountingRepository{
		coll:          db.Collection("accounting_entries"),
		paymentsColl:  db.Collection("payments"),
		plansColl:     db.Collection("installment_plans"),
		productsColl:  db.Collection("products"),
		inventoryColl: db.Collection("inventory_items"),
	}
}

func (r *AccountingRepository) Create(ctx context.Context, e *domain.AccountingEntry) error {
	if e.ID == "" {
		e.ID = primitive.NewObjectID().Hex()
	}
	e.CreatedAt = time.Now()

	_, err := r.coll.InsertOne(ctx, e)
	return err
}

func (r *AccountingRepository) GetCashFlowReport(ctx context.Context, start, end time.Time) ([]domain.AccountingEntry, error) {
	cursor, err := r.coll.Find(ctx, bson.M{
		"date":  bson.M{"$gte": start, "$lt": end},
		"basis": "cash",
	}, options.Find().SetSort(bson.D{{Key: "date", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var entries []domain.AccountingEntry
	err = cursor.All(ctx, &entries)
	if err != nil {
		return nil, err
	}
	if entries == nil {
		entries = []domain.AccountingEntry{}
	}
	return entries, nil
}

func (r *AccountingRepository) GetAccrualReport(ctx context.Context, start, end time.Time) ([]domain.AccountingEntry, error) {
	cursor, err := r.coll.Find(ctx, bson.M{
		"date":  bson.M{"$gte": start, "$lt": end},
		"basis": "accrual",
	}, options.Find().SetSort(bson.D{{Key: "date", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var entries []domain.AccountingEntry
	err = cursor.All(ctx, &entries)
	if err != nil {
		return nil, err
	}
	if entries == nil {
		entries = []domain.AccountingEntry{}
	}
	return entries, nil
}

func (r *AccountingRepository) GetSoldItems(ctx context.Context, start, end time.Time) ([]domain.InventoryItem, error) {
	cursor, err := r.inventoryColl.Find(ctx, bson.M{
		"solddate": bson.M{"$gte": start, "$lt": end},
		"status":   "sold",
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var items []domain.InventoryItem
	err = cursor.All(ctx, &items)
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []domain.InventoryItem{}
	}
	return items, nil
}

func (r *AccountingRepository) GetRevenueAndProfit(ctx context.Context, start, end time.Time) (revenue float64, profit float64, err error) {
	// Revenue from payments
	matchStage := bson.D{
		{Key: "$match", Value: bson.M{
			"transactiondate": bson.M{"$gte": start, "$lt": end},
		}},
	}
	groupStage := bson.D{
		{Key: "$group", Value: bson.M{
			"_id":   nil,
			"total": bson.M{"$sum": "$amount"},
		}},
	}
	cursor, err := r.paymentsColl.Aggregate(ctx, mongo.Pipeline{matchStage, groupStage})
	if err == nil {
		var results []bson.M
		if err := cursor.All(ctx, &results); err == nil && len(results) > 0 {
			if total, ok := results[0]["total"].(float64); ok {
				revenue = total
			}
		}
		cursor.Close(ctx)
	}

	// Down payment revenue is already recorded in payments collection by CreatePlan
	// No need to query installment_plans separately - avoids double counting

	// Profit calculation using aggregation pipeline
	// Profit = Payment * (1 - PurchasePrice / TotalAmount)
	// IMPORTANT: If purchaseprice is null or 0, profit is 0 (not full amount)
	// First normalize purchasePrice - check both camelCase and lowercase field names
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"transactiondate": bson.M{"$gte": start, "$lt": end},
		}}},
		{{Key: "$lookup", Value: bson.M{
			"from":         "installment_plans",
			"localField":   "installmentplanid",
			"foreignField": "_id",
			"as":           "plan",
		}}},
		{{Key: "$unwind", Value: "$plan"}},
		{{Key: "$lookup", Value: bson.M{
			"from":         "products",
			"localField":   "plan.productid",
			"foreignField": "_id",
			"as":           "product",
		}}},
		{{Key: "$unwind", Value: bson.D{
			{Key: "path", Value: "$product"},
			{Key: "preserveNullAndEmptyArrays", Value: true},
		}}},
		// Normalize purchasePrice - check both camelCase and lowercase field names
		{{Key: "$addFields", Value: bson.M{
			"normalizedPurchasePrice": bson.M{"$cond": []interface{}{
				bson.M{"$gt": []interface{}{
					bson.M{"$ifNull": []interface{}{"$product.purchasePrice", 0}},
					0,
				}},
				bson.M{"$ifNull": []interface{}{"$product.purchasePrice", 0}},
				bson.M{"$ifNull": []interface{}{"$product.purchaseprice", 0}},
			}},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": nil,
			"totalProfit": bson.M{
				"$sum": bson.M{
					"$multiply": []interface{}{
						"$amount",
						bson.M{"$subtract": []interface{}{
							1,
							bson.M{"$cond": []interface{}{
								bson.M{"$and": []interface{}{
									bson.M{"$gt": []interface{}{"$plan.totalamount", 0}},
									bson.M{"$gt": []interface{}{
										"$normalizedPurchasePrice",
										0,
									}},
								}},
								bson.M{"$divide": []interface{}{
									"$normalizedPurchasePrice",
									"$plan.totalamount",
								}},
								0,
							}},
						}},
					},
				},
			},
		}}},
	}

	cursor3, err := r.paymentsColl.Aggregate(ctx, pipeline)
	if err == nil {
		var results []bson.M
		if err := cursor3.All(ctx, &results); err == nil && len(results) > 0 {
			if totalProfit, ok := results[0]["totalProfit"].(float64); ok {
				profit = totalProfit
			}
		}
		cursor3.Close(ctx)
	}

	// Down payment profit is already included in payments profit calculation above
	// since down payments are recorded in payments collection by CreatePlan
	// No need to calculate separately - avoids double counting

	// Subtract expenses
	matchStage3 := bson.D{
		{Key: "$match", Value: bson.M{
			"type": "expense",
			"date": bson.M{"$gte": start, "$lt": end},
		}},
	}
	groupStage3 := bson.D{
		{Key: "$group", Value: bson.M{
			"_id":   nil,
			"total": bson.M{"$sum": "$amount"},
		}},
	}
	cursor5, err := r.coll.Aggregate(ctx, mongo.Pipeline{matchStage3, groupStage3})
	if err == nil {
		var results []bson.M
		if err := cursor5.All(ctx, &results); err == nil && len(results) > 0 {
			if total, ok := results[0]["total"].(float64); ok {
				profit -= total
			}
		}
		cursor5.Close(ctx)
	}

	return revenue, profit, nil
}

func (r *AccountingRepository) DeleteByPlanID(ctx context.Context, planID string) error {
	_, err := r.coll.DeleteMany(ctx, bson.M{"relatedplanid": planID})
	return err
}

func (r *AccountingRepository) DeleteByPlanIDAndDate(ctx context.Context, planID string, date time.Time) error {
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)
	_, err := r.coll.DeleteMany(ctx, bson.M{
		"relatedplanid": planID,
		"date":          bson.M{"$gte": startOfDay, "$lt": endOfDay},
	})
	return err
}
