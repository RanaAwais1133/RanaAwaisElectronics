package receipt

import (
	"bytes"
	"fmt"
	"image/jpeg"
	"os"
	"runtime"
	"time"

	"github.com/fogleman/gg"
	"github.com/your-org/rana-awais-backend/internal/domain"
)

func getFontPath() string {
	if runtime.GOOS == "windows" {
		// Try Urdu-supporting fonts first
		urduFonts := []string{
			"C:/Windows/Fonts/NotoNastaliqUrdu.ttf",
			"C:/Windows/Fonts/Arial.ttf",
		}
		for _, p := range urduFonts {
			if _, err := os.Stat(p); err == nil {
				return p
			}
		}
		return "C:/Windows/Fonts/Arial.ttf"
	}
	paths := []string{
		"/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
		"/usr/share/fonts/TTF/DejaVuSans.ttf",
		"/System/Library/Fonts/Helvetica.ttc",
	}
	for _, p := range paths {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return ""
}

// GenerateInstallmentReceipt generates a complete bilingual receipt for an installment plan
func GenerateInstallmentReceipt(plan *domain.InstallmentPlan, customer *domain.Customer, product *domain.Product, guarantors []domain.Guarantor) ([]byte, error) {
	const W = 800
	lineH := 24.0
	leftX := 45.0
	rightX := 755.0
	startY := 120.0

	// Calculate total rows needed
	dataRows := 2 + // header space
		2 + // customer title + details
		2 + // product title + details
		2 + // guarantor title + details
		len(guarantors)*3 + // each guarantor 3 lines
		2 + // schedule title
		len(plan.Installments) + 1 + // schedule rows
		8 // footer lines (including software credit)

	totalH := startY + float64(dataRows)*lineH + 80

	dc := gg.NewContext(W, int(totalH))
	dc.SetRGB(1, 1, 1)
	dc.Clear()

	fontPath := getFontPath()

	// ===== HEADER =====
	dc.SetRGB(0.02, 0.08, 0.30)
	dc.DrawRectangle(0, 0, W, 105)
	dc.Fill()

	// Shop Name
	dc.SetRGB(1, 1, 1)
	dc.LoadFontFace(fontPath, 22)
	dc.DrawStringAnchored("RANA AWAIS ELECTRONICS", W/2, 38, 0.5, 0.5)

	// Address - English
	dc.LoadFontFace(fontPath, 11)
	dc.DrawStringAnchored("Behari Colony, Disposal Chowk, Bismillah Service Station,", W/2, 62, 0.5, 0.5)
	dc.DrawStringAnchored("Opposite Al-Noor Store, Kacha Aiemanabad Road, Gujranwala", W/2, 78, 0.5, 0.5)

	// Urdu Title
	dc.LoadFontFace(fontPath, 13)
	dc.DrawStringAnchored("Installment Plan Receipt | قسط پلان رسید", W/2, 98, 0.5, 0.5)

	y := startY + 5

	// ===== HELPER FUNCTIONS =====
	drawSection := func(title string) {
		dc.SetRGB(0.90, 0.94, 1.0)
		dc.DrawRectangle(leftX-5, y-3, rightX-leftX+10, lineH+2)
		dc.Fill()
		dc.SetRGB(0.02, 0.08, 0.30)
		dc.LoadFontFace(fontPath, 11)
		dc.DrawString(title, leftX, y+lineH-9)
		y += lineH + 6
	}

	drawLine := func(label, value string) {
		dc.SetRGB(0.35, 0.35, 0.35)
		dc.LoadFontFace(fontPath, 10)
		dc.DrawString(label, leftX+8, y+lineH-10)
		dc.SetRGB(0.05, 0.05, 0.05)
		dc.LoadFontFace(fontPath, 10)
		dc.DrawString(value, leftX+175, y+lineH-10)
		y += lineH
	}

	// ===== CUSTOMER DETAILS =====
	drawSection("CUSTOMER DETAILS | گاہک کی معلومات")
	drawLine("Name:", customer.Name)
	if customer.FatherName != "" {
		drawLine("Father Name:", customer.FatherName)
	}
	if customer.NameUrdu != "" {
		drawLine("Name (Urdu):", customer.NameUrdu)
	}
	drawLine("Phone:", customer.Phone)
	if customer.CNIC != "" {
		drawLine("CNIC:", customer.CNIC)
	}
	if customer.Address != "" {
		drawLine("Address:", customer.Address)
	}
	if customer.AddressUrdu != "" {
		drawLine("Address (Urdu):", customer.AddressUrdu)
	}
	y += 4

	// ===== PRODUCT DETAILS =====
	drawSection("PRODUCT DETAILS | پروڈکٹ کی معلومات")
	drawLine("Product:", product.Name)
	if product.NameUrdu != "" {
		drawLine("Product (Urdu):", product.NameUrdu)
	}
	drawLine("Total Amount:", fmt.Sprintf("Rs. %.2f", plan.TotalAmount))
	drawLine("Down Payment:", fmt.Sprintf("Rs. %.2f", plan.DownPayment))
	drawLine("Remaining:", fmt.Sprintf("Rs. %.2f", plan.RemainingAmount))
	drawLine("Installments:", fmt.Sprintf("%d x Rs. %.2f", plan.NumberOfInstallments, plan.InstallmentAmount))

	if plan.SerialNumber != "" {
		drawLine("Serial No:", plan.SerialNumber)
	}
	if plan.Model != "" {
		drawLine("Model:", plan.Model)
	}
	if plan.Color != "" {
		drawLine("Color:", plan.Color)
	}
	if plan.Company != "" {
		drawLine("Company:", plan.Company)
	}
	if plan.EngineNo != "" {
		drawLine("Engine No:", plan.EngineNo)
	}
	if plan.ChassisNo != "" {
		drawLine("Chassis No:", plan.ChassisNo)
	}
	if plan.IMEI != "" {
		drawLine("IMEI:", plan.IMEI)
	}
	y += 4

	// ===== GUARANTORS =====
	if len(guarantors) > 0 {
		drawSection("GUARANTORS | ضامن")
		for i, g := range guarantors {
			drawLine(fmt.Sprintf("Guarantor %d:", i+1), g.Name)
			drawLine("Phone:", g.Phone)
			if g.CNIC != "" {
				drawLine("CNIC:", g.CNIC)
			}
			drawLine("Relation:", g.RelationToCustomer)
			y += 2
		}
	}
	y += 4

	// ===== INSTALLMENT SCHEDULE =====
	drawSection("INSTALLMENT SCHEDULE | قسطوں کا شیڈول")

	// Table Header
	dc.SetRGB(0.92, 0.92, 0.92)
	dc.DrawRectangle(leftX-5, y-3, rightX-leftX+10, lineH+2)
	dc.Fill()
	dc.SetRGB(0.05, 0.05, 0.05)
	dc.LoadFontFace(fontPath, 9)
	dc.DrawString("#", leftX+10, y+lineH-10)
	dc.DrawString("Due Date", leftX+50, y+lineH-10)
	dc.DrawString("Amount", leftX+210, y+lineH-10)
	dc.DrawString("Fine", leftX+330, y+lineH-10)
	dc.DrawString("Paid", leftX+430, y+lineH-10)
	dc.DrawString("Status", leftX+530, y+lineH-10)
	y += lineH + 4

	for _, inst := range plan.Installments {
		status := "Pending"
		statusColor := [3]float64{0.8, 0.3, 0.3}
		if inst.Paid {
			status = "Paid"
			statusColor = [3]float64{0.2, 0.7, 0.3}
		}

		// Show exact amount paid
		paidAmount := inst.PartialPaid
		if inst.Paid && inst.PartialPaid == 0 {
			paidAmount = inst.Amount
		}

		dc.SetRGB(0.05, 0.05, 0.05)
		dc.LoadFontFace(fontPath, 9)
		dc.DrawString(fmt.Sprintf("%d", inst.InstallmentNo), leftX+10, y+lineH-10)
		dc.DrawString(inst.DueDate.Format("02-Jan-2006"), leftX+50, y+lineH-10)
		dc.DrawString(fmt.Sprintf("Rs. %.2f", inst.Amount), leftX+210, y+lineH-10)
		dc.DrawString(fmt.Sprintf("Rs. %.2f", inst.Fine), leftX+330, y+lineH-10)
		dc.DrawString(fmt.Sprintf("Rs. %.2f", paidAmount), leftX+430, y+lineH-10)
		dc.SetRGB(statusColor[0], statusColor[1], statusColor[2])
		dc.DrawString(status, leftX+530, y+lineH-10)
		y += lineH
	}

	// ===== PAYMENT SUMMARY =====
	y += 10
	dc.SetRGB(0.02, 0.08, 0.30)
	dc.LoadFontFace(fontPath, 11)
	dc.DrawString("PAYMENT SUMMARY | ادائیگی کا خلاصہ", leftX, y)
	y += lineH + 4

	totalPaid := 0.0
	totalFine := 0.0
	for _, inst := range plan.Installments {
		if inst.Paid {
			paidAmt := inst.PartialPaid
			if paidAmt == 0 {
				paidAmt = inst.Amount
			}
			totalPaid += paidAmt
			totalFine += inst.Fine
		}
	}

	dc.SetRGB(0.05, 0.05, 0.05)
	dc.LoadFontFace(fontPath, 10)
	dc.DrawString(fmt.Sprintf("Total Paid: Rs. %.2f", totalPaid), leftX+8, y+lineH-10)
	dc.DrawString(fmt.Sprintf("Total Fine: Rs. %.2f", totalFine), leftX+300, y+lineH-10)
	y += lineH
	dc.DrawString(fmt.Sprintf("Remaining: Rs. %.2f", plan.RemainingAmount-totalPaid), leftX+8, y+lineH-10)

	// ===== FOOTER =====
	y += 20
	dc.SetRGB(0.7, 0.7, 0.7)
	dc.SetLineWidth(0.5)
	dc.DrawLine(leftX, y-10, rightX, y-10)
	dc.Stroke()

	dc.SetRGB(0.3, 0.3, 0.3)
	dc.LoadFontFace(fontPath, 10)
	dc.DrawString("Shop Address:", leftX, y)
	y += lineH - 2
	dc.SetRGB(0.4, 0.4, 0.4)
	dc.LoadFontFace(fontPath, 9)
	dc.DrawString("Behari Colony, Disposal Chowk, Bismillah Service Station,", leftX, y)
	y += lineH - 4
	dc.DrawString("Opposite Al-Noor Store, Kacha Aiemanabad Road, Gujranwala", leftX, y)

	y += lineH + 4
	dc.SetRGB(0.3, 0.3, 0.3)
	dc.LoadFontFace(fontPath, 10)
	dc.DrawString("Contact:", leftX, y)
	y += lineH - 2
	dc.SetRGB(0.4, 0.4, 0.4)
	dc.LoadFontFace(fontPath, 9)
	dc.DrawString("Muhammad Khan: 0300-7496251  |  Sultan Muhammad Khan: 0319-6429115", leftX, y)

	y += lineH + 8
	dc.SetRGB(0.7, 0.7, 0.7)
	dc.SetLineWidth(0.5)
	dc.DrawLine(leftX, y-6, rightX, y-6)
	dc.Stroke()

	dc.SetRGB(0.55, 0.55, 0.55)
	dc.LoadFontFace(fontPath, 9)
	dc.DrawString(fmt.Sprintf("Generated: %s", time.Now().Format("02-Jan-2006 03:04 PM")), leftX, y)

	// ===== SOFTWARE CREDIT - Prominent =====
	y += lineH + 4
	dc.SetRGB(0.02, 0.08, 0.30)
	dc.SetLineWidth(1.5)
	dc.DrawRectangle(leftX-5, y-5, rightX-leftX+10, lineH+14)
	dc.Fill()
	dc.SetRGB(1, 1, 1)
	dc.LoadFontFace(fontPath, 11)
	dc.DrawStringAnchored("Software by: Huzaifa Qasim (0313-6487199)", W/2, y+lineH/2+2, 0.5, 0.5)

	y += lineH + 12
	dc.SetRGB(0.6, 0.6, 0.6)
	dc.LoadFontFace(fontPath, 8)
	dc.DrawString("Thank you for choosing Rana Awais Electronics! | رانا اویس الیکٹرانکس پر اعتماد کے لیے شکریہ!", leftX, y)

	var buf bytes.Buffer
	jpeg.Encode(&buf, dc.Image(), &jpeg.Options{Quality: 95})
	return buf.Bytes(), nil
}
