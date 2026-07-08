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

type InstallmentRepository struct {
	coll       *mongo.Collection
	detailsColl *mongo.Collection
}

func NewInstallmentRepository(db *mongo.Database) *InstallmentRepository {
	return &InstallmentRepository{
		coll:       db.Collection("installment_plans"),
		detailsColl: db.Collection("installment_details"),
	}
}

func (r *InstallmentRepository) Create(ctx context.Context, plan *domain.InstallmentPlan) error {
	if plan.ID == "" {
		plan.ID = primitive.NewObjectID().Hex()
	}
	plan.CreatedAt = time.Now()
	plan.UpdatedAt = time.Now()

	// Insert the plan
	_, err := r.coll.InsertOne(ctx, plan)
	if err != nil {
		return err
	}

	// Insert installment details as separate documents
	for _, inst := range plan.Installments {
		detail := installmentDetailDoc{
			PlanID:        plan.ID,
			InstallmentNo: inst.InstallmentNo,
			DueDate:       inst.DueDate,
			Amount:        inst.Amount,
			Paid:          inst.Paid,
			PaidDate:      inst.PaidDate,
			Fine:          inst.Fine,
			FinePerDay:    inst.FinePerDay,
			DaysLate:      inst.DaysLate,
			FineApplied:   inst.FineApplied,
			TotalPayable:  inst.TotalPayable,
			PartialPaid:   inst.PartialPaid,
			Remaining:     inst.Remaining,
			CollectedBy:   inst.CollectedBy,
			CollectedById: inst.CollectedById,
			Remarks:       inst.Remarks,
		}
		_, err = r.detailsColl.InsertOne(ctx, detail)
		if err != nil {
			return err
		}
	}

	return nil
}

// installmentDetailDoc is the MongoDB document for installment details
type installmentDetailDoc struct {
	ID            primitive.ObjectID `bson:"_id,omitempty"`
	PlanID        string             `bson:"plan_id"`
	InstallmentNo int                `bson:"installment_no"`
	DueDate       time.Time          `bson:"due_date"`
	Amount        float64            `bson:"amount"`
	Paid          bool               `bson:"paid"`
	PaidDate      *time.Time         `bson:"paid_date,omitempty"`
	Fine          float64            `bson:"fine"`
	FinePerDay    float64            `bson:"fine_per_day"`
	DaysLate      int                `bson:"days_late"`
	FineApplied   float64            `bson:"fine_applied"`
	TotalPayable  float64            `bson:"total_payable"`
	PartialPaid   float64            `bson:"partial_paid"`
	Remaining     float64            `bson:"remaining"`
	CollectedBy   string             `bson:"collected_by,omitempty"`
	CollectedById string             `bson:"collected_by_id,omitempty"`
	Remarks       string             `bson:"remarks,omitempty"`
}

func (r *InstallmentRepository) GetByID(ctx context.Context, id string) (*domain.InstallmentPlan, error) {
	var plan domain.InstallmentPlan
	err := r.coll.FindOne(ctx, getFilterByID(id)).Decode(&plan)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}


	// Load installment details
	details, err := r.loadInstallmentDetails(ctx, id)
	if err != nil {
		return nil, err
	}
	plan.Installments = details

	return &plan, nil
}

func (r *InstallmentRepository) loadInstallmentDetails(ctx context.Context, planID string) ([]domain.InstallmentDetail, error) {
	cursor, err := r.detailsColl.Find(ctx, bson.M{"plan_id": planID}, options.Find().SetSort(bson.D{{Key: "installment_no", Value: 1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var docs []installmentDetailDoc
	err = cursor.All(ctx, &docs)
	if err != nil {
		return nil, err
	}

	var details []domain.InstallmentDetail
	for _, d := range docs {
		details = append(details, domain.InstallmentDetail{
			InstallmentNo: d.InstallmentNo,
			DueDate:       d.DueDate,
			Amount:        d.Amount,
			Paid:          d.Paid,
			PaidDate:      d.PaidDate,
			Fine:          d.Fine,
			FinePerDay:    d.FinePerDay,
			DaysLate:      d.DaysLate,
			FineApplied:   d.FineApplied,
			TotalPayable:  d.TotalPayable,
			PartialPaid:   d.PartialPaid,
			Remaining:     d.Remaining,
			CollectedBy:   d.CollectedBy,
			CollectedById: d.CollectedById,
			Remarks:       d.Remarks,
		})
	}
	if details == nil {
		details = []domain.InstallmentDetail{}
	}
	return details, nil
}

func (r *InstallmentRepository) Update(ctx context.Context, id string, plan *domain.InstallmentPlan) error {
	plan.UpdatedAt = time.Now()

	// Use $set instead of ReplaceOne for safety
	updateFields := bson.M{
		"customerid":           plan.CustomerID,
		"productid":            plan.ProductID,
		"inventoryitemid":      plan.InventoryItemID,
		"guarantorids":         plan.GuarantorIDs,
		"totalamount":          plan.TotalAmount,
		"downpayment":          plan.DownPayment,
		"remainingamount":      plan.RemainingAmount,
		"numinstallments":      plan.NumberOfInstallments,
		"installmentamount":    plan.InstallmentAmount,
		"startdate":            plan.StartDate,
		"enddate":              plan.EndDate,
		"graceperioddays":      plan.GracePeriodDays,
		"fineperday":           plan.FinePerDay,
		"finetype":             plan.FineType,
		"fixedfineamount":      plan.FixedFineAmount,
		"status":               plan.Status,
		"installmentdate":      plan.InstallmentDate,
		"paymenttype":          plan.PaymentType,
		"serialnumber":         plan.SerialNumber,
		"imei":                 plan.IMEI,
		"engineno":             plan.EngineNo,
		"chassisno":            plan.ChassisNo,
		"model":                plan.Model,
		"color":                plan.Color,
		"company":              plan.Company,
		"processfee":           plan.ProcessFee,
		"discount":             plan.Discount,
		"salaryincome":         plan.SalaryIncome,
		"defaulter":            plan.Defaulter,
		"pto":                  plan.PTO,
		"vpnstatus":            plan.VPNStatus,
		"employeestatus":       plan.EmployeeStatus,
		"dbmremarks":           plan.DBMRemarks,
		"crcremarks":           plan.CRCRemarks,
		"processat":            plan.ProcessAt,
		"doofficer":            plan.DOOfficer,
		"markoff":              plan.MarkOff,
		"debtmng":              plan.DebtMng,
		"secondmng":            plan.SecondMng,
		"inspoff":              plan.InspOff,
		"srm":                  plan.SRM,
		"mobilephone":          plan.MobilePhone,
		"crc":                  plan.CRC,
		"createdby":            plan.CreatedBy,
		"remarks":              plan.Remarks,
		"completeddate":        plan.CompletedDate,
		"completedby":          plan.CompletedBy,
		"updatedat":            plan.UpdatedAt,
	}
	_, err := r.coll.UpdateOne(ctx, getFilterByID(id), bson.M{"$set": updateFields})
	if err != nil {
		return err
	}

	// Delete old details and re-insert
	_, err = r.detailsColl.DeleteMany(ctx, bson.M{"plan_id": id})
	if err != nil {
		return err
	}

	for _, inst := range plan.Installments {
		detail := installmentDetailDoc{
			PlanID:        id,
			InstallmentNo: inst.InstallmentNo,
			DueDate:       inst.DueDate,
			Amount:        inst.Amount,
			Paid:          inst.Paid,
			PaidDate:      inst.PaidDate,
			Fine:          inst.Fine,
			FinePerDay:    inst.FinePerDay,
			DaysLate:      inst.DaysLate,
			FineApplied:   inst.FineApplied,
			TotalPayable:  inst.TotalPayable,
			PartialPaid:   inst.PartialPaid,
			Remaining:     inst.Remaining,
			CollectedBy:   inst.CollectedBy,
			CollectedById: inst.CollectedById,
			Remarks:       inst.Remarks,
		}
		_, err = r.detailsColl.InsertOne(ctx, detail)
		if err != nil {
			return err
		}
	}

	return nil
}

func (r *InstallmentRepository) Delete(ctx context.Context, id string) error {
	// Delete details first
	_, err := r.detailsColl.DeleteMany(ctx, bson.M{"plan_id": id})
	if err != nil {
		return err
	}

	_, err = r.coll.DeleteOne(ctx, getFilterByID(id))
	return err
}


func (r *InstallmentRepository) ListByCustomer(ctx context.Context, customerID string) ([]domain.InstallmentPlan, error) {
	cursor, err := r.coll.Find(ctx, bson.M{"customerid": customerID}, options.Find().SetSort(bson.D{{Key: "createdat", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var plans []domain.InstallmentPlan
	err = cursor.All(ctx, &plans)
	if err != nil {
		return nil, err
	}

	// Load details for each plan
	for i := range plans {
		details, err := r.loadInstallmentDetails(ctx, plans[i].ID)
		if err != nil {
			return nil, err
		}
		plans[i].Installments = details
	}
	if plans == nil {
		plans = []domain.InstallmentPlan{}
	}
	return plans, nil
}

func (r *InstallmentRepository) GetActivePlans(ctx context.Context) ([]domain.InstallmentPlan, error) {
	cursor, err := r.coll.Find(ctx, bson.M{"status": "active"}, options.Find().SetSort(bson.D{{Key: "createdat", Value: -1}}))
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var plans []domain.InstallmentPlan
	err = cursor.All(ctx, &plans)
	if err != nil {
		return nil, err
	}

	for i := range plans {
		details, err := r.loadInstallmentDetails(ctx, plans[i].ID)
		if err != nil {
			return nil, err
		}
		plans[i].Installments = details
	}
	if plans == nil {
		plans = []domain.InstallmentPlan{}
	}
	return plans, nil
}

func (r *InstallmentRepository) GetPlansWithDueDate(ctx context.Context, dueDate time.Time) ([]domain.InstallmentPlan, error) {
	startOfDay := time.Date(dueDate.Year(), dueDate.Month(), dueDate.Day(), 0, 0, 0, 0, dueDate.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	// Find distinct plan_ids from details where due_date matches and not paid
	cursor, err := r.detailsColl.Find(ctx, bson.M{
		"due_date": bson.M{"$gte": startOfDay, "$lt": endOfDay},
		"paid":     false,
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var detailDocs []installmentDetailDoc
	err = cursor.All(ctx, &detailDocs)
	if err != nil {
		return nil, err
	}

	// Get unique plan IDs
	planIDs := make(map[string]bool)
	for _, d := range detailDocs {
		planIDs[d.PlanID] = true
	}

	var plans []domain.InstallmentPlan
	for pid := range planIDs {
		plan, err := r.GetByID(ctx, pid)
		if err != nil {
			return nil, err
		}
		if plan != nil {
			plans = append(plans, *plan)
		}
	}
	if plans == nil {
		plans = []domain.InstallmentPlan{}
	}
	return plans, nil
}

func (r *InstallmentRepository) AddPaymentDetail(ctx context.Context, planID string, installmentNo int, payment domain.InstallmentDetail) error {
	_, err := r.detailsColl.UpdateOne(ctx, bson.M{
		"plan_id":        planID,
		"installment_no": installmentNo,
	}, bson.M{"$set": bson.M{
		"paid":          payment.Paid,
		"paid_date":     payment.PaidDate,
		"fine":          payment.Fine,
		"partial_paid":  payment.PartialPaid,
		"remaining":     payment.Remaining,
		"collected_by":  payment.CollectedBy,
		"collected_by_id": payment.CollectedById,
		"remarks":       payment.Remarks,
	}})
	return err
}

func (r *InstallmentRepository) UpdateInstallmentStatus(ctx context.Context, planID string, installmentNo int, paid bool, paidDate *time.Time) error {
	_, err := r.detailsColl.UpdateOne(ctx, bson.M{
		"plan_id":        planID,
		"installment_no": installmentNo,
	}, bson.M{"$set": bson.M{
		"paid":      paid,
		"paid_date": paidDate,
	}})
	return err
}

func (r *InstallmentRepository) GetPlansWithDueDateRange(ctx context.Context, start, end time.Time) ([]domain.InstallmentPlan, error) {
	cursor, err := r.detailsColl.Find(ctx, bson.M{
		"due_date": bson.M{"$gte": start, "$lt": end},
		"paid":     false,
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var detailDocs []installmentDetailDoc
	err = cursor.All(ctx, &detailDocs)
	if err != nil {
		return nil, err
	}

	planIDs := make(map[string]bool)
	for _, d := range detailDocs {
		planIDs[d.PlanID] = true
	}

	var plans []domain.InstallmentPlan
	for pid := range planIDs {
		plan, err := r.GetByID(ctx, pid)
		if err != nil {
			return nil, err
		}
		if plan != nil {
			plans = append(plans, *plan)
		}
	}
	if plans == nil {
		plans = []domain.InstallmentPlan{}
	}
	return plans, nil
}

func (r *InstallmentRepository) ListAll(ctx context.Context, skip, limit int64) ([]domain.InstallmentPlan, error) {
	opts := options.Find().
		SetSkip(skip).
		SetLimit(limit).
		SetSort(bson.D{{Key: "createdat", Value: -1}})
	cursor, err := r.coll.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var plans []domain.InstallmentPlan
	err = cursor.All(ctx, &plans)
	if err != nil {
		return nil, err
	}

	for i := range plans {
		details, err := r.loadInstallmentDetails(ctx, plans[i].ID)
		if err != nil {
			return nil, err
		}
		plans[i].Installments = details
	}
	if plans == nil {
		plans = []domain.InstallmentPlan{}
	}
	return plans, nil
}

func (r *InstallmentRepository) GetInstallmentsByDateRange(ctx context.Context, start, end time.Time) ([]domain.InstallmentDetail, error) {
	cursor, err := r.detailsColl.Find(ctx, bson.M{
		"due_date": bson.M{"$gte": start, "$lt": end},
	})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var docs []installmentDetailDoc
	err = cursor.All(ctx, &docs)
	if err != nil {
		return nil, err
	}

	var details []domain.InstallmentDetail
	for _, d := range docs {
		details = append(details, domain.InstallmentDetail{
			InstallmentNo: d.InstallmentNo,
			DueDate:       d.DueDate,
			Amount:        d.Amount,
			Paid:          d.Paid,
			PaidDate:      d.PaidDate,
			Fine:          d.Fine,
			FinePerDay:    d.FinePerDay,
			DaysLate:      d.DaysLate,
			FineApplied:   d.FineApplied,
			TotalPayable:  d.TotalPayable,
			PartialPaid:   d.PartialPaid,
			Remaining:     d.Remaining,
			CollectedBy:   d.CollectedBy,
			CollectedById: d.CollectedById,
			Remarks:       d.Remarks,
		})
	}
	if details == nil {
		details = []domain.InstallmentDetail{}
	}
	return details, nil
}
