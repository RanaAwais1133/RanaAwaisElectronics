package aggregations

import (
	"context"
	"time"

	"github.com/RanaAwais1133/RanaAwaisElectronics/rana-awais-backend/config"
	"go.mongodb.org/mongo-driver/bson"
)

// CashFlowSummary holds the result of a cash‑flow or accrual aggregation.
type CashFlowSummary struct {
	TotalIncome  float64 `bson:"total_income"`
	TotalExpense float64 `bson:"total_expense"`
}

// GetCashFlowSummary runs an aggregation pipeline on accounting entries (basis="cash_flow").
// start and end are inclusive time boundaries.
func GetCashFlowSummary(ctx context.Context, start, end time.Time) (*CashFlowSummary, error) {
	coll := config.DB.Collection("accounting")
	pipeline := bson.A{
		bson.M{
			"$match": bson.M{
				"basis": "cash_flow",
				"date": bson.M{
					"$gte": start,
					"$lte": end,
				},
			},
		},
		bson.M{
			"$group": bson.M{
				"_id": nil,
				"total_income": bson.M{
					"$sum": bson.M{
						"$cond": bson.A{
							bson.M{"$eq": bson.A{"$type", "income"}},
							"$amount",
							0,
						},
					},
				},
				"total_expense": bson.M{
					"$sum": bson.M{
						"$cond": bson.A{
							bson.M{"$eq": bson.A{"$type", "expense"}},
							"$amount",
							0,
						},
					},
				},
			},
		},
	}

	cursor, err := coll.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []CashFlowSummary
	if err = cursor.All(ctx, &results); err != nil {
		return nil, err
	}
	if len(results) == 0 {
		return &CashFlowSummary{}, nil
	}
	return &results[0], nil
}

// GetAccrualSummary runs the same aggregation but on accrual‑basis entries.
func GetAccrualSummary(ctx context.Context, start, end time.Time) (*CashFlowSummary, error) {
	coll := config.DB.Collection("accounting")
	pipeline := bson.A{
		bson.M{
			"$match": bson.M{
				"basis": "accrual",
				"date": bson.M{
					"$gte": start,
					"$lte": end,
				},
			},
		},
		bson.M{
			"$group": bson.M{
				"_id": nil,
				"total_income": bson.M{
					"$sum": bson.M{
						"$cond": bson.A{
							bson.M{"$eq": bson.A{"$type", "income"}},
							"$amount",
							0,
						},
					},
				},
				"total_expense": bson.M{
					"$sum": bson.M{
						"$cond": bson.A{
							bson.M{"$eq": bson.A{"$type", "expense"}},
							"$amount",
							0,
						},
					},
				},
			},
		},
	}

	cursor, err := coll.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []CashFlowSummary
	if err = cursor.All(ctx, &results); err != nil {
		return nil, err
	}
	if len(results) == 0 {
		return &CashFlowSummary{}, nil
	}
	return &results[0], nil
}
