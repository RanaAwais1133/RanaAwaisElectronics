package receipt

import (
	"bytes"
	"fmt"
	"image/jpeg"
	"os"
	"runtime"
	"strings"
	"time"

	"github.com/fogleman/gg"
	"github.com/your-org/rana-awais-backend/config"
	"github.com/your-org/rana-awais-backend/internal/domain"
)

type ReceiptConfig struct {
	ShopName      string
	ShopNameUr    string
	Address       string
	AddressUr     string
	ContactPhones string
	SoftwareBy    string
	SoftwareByUr  string
	ThankYouMsg   string
	ThankYouMsgUr string
}

// DefaultReceiptConfig returns config from APP_CONFIG — fully dynamic
func DefaultReceiptConfig() ReceiptConfig {
	return ReceiptConfig{
		ShopName:      config.APP_CONFIG.CompanyName,
		ShopNameUr:    config.APP_CONFIG.CompanyNameUr,
		Address:       config.APP_CONFIG.Address,
		AddressUr:     config.APP_CONFIG.AddressUr,
		ContactPhones: strings.Join(config.APP_CONFIG.Phones, " | "),
		SoftwareBy:    config.APP_CONFIG.SoftwareBy,
		SoftwareByUr:  config.APP_CONFIG.SoftwareByUr,
		ThankYouMsg:   "Thank you for choosing " + config.APP_CONFIG.CompanyName + "!",
		ThankYouMsgUr: config.APP_CONFIG.CompanyNameUr + " پر اعتماد کے لیے شکریہ!",
	}
}

// ApplyToConfig fills empty fields with provided values
func ApplyToConfig(cfg *ReceiptConfig, co, cour, ad, adur, ph, sw, swur string) {
	if cfg.ShopName == "" {
		cfg.ShopName = co
	}
	if cfg.ShopNameUr == "" {
		cfg.ShopNameUr = cour
	}
	if cfg.Address == "" {
		cfg.Address = ad
	}
	if cfg.AddressUr == "" {
		cfg.AddressUr = adur
	}
	if cfg.ContactPhones == "" {
		cfg.ContactPhones = ph
	}
	if cfg.SoftwareBy == "" {
		cfg.SoftwareBy = sw
	}
	if cfg.SoftwareByUr == "" {
		cfg.SoftwareByUr = swur
	}
}

func splitLines(s string, m int) []string {
	p := strings.Split(s, "\n")
	if len(p) < 2 {
		p = strings.Split(s, " | ")
	}
	var r []string
	for _, v := range p {
		v = strings.TrimSpace(v)
		if v != "" {
			r = append(r, v)
		}
		if len(r) >= m {
			break
		}
	}
	if len(r) == 0 {
		r = append(r, s)
	}
	return r
}

func getFontPath() string {
	if runtime.GOOS == "windows" {
		for _, p := range []string{
			"C:/Windows/Fonts/NotoNastaliqUrdu.ttf",
			"C:/Windows/Fonts/Arial.ttf",
		} {
			if _, e := os.Stat(p); e == nil {
				return p
			}
		}
		return "C:/Windows/Fonts/Arial.ttf"
	}
	for _, p := range []string{
		"/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
		"/usr/share/fonts/TTF/DejaVuSans.ttf",
		"/System/Library/Fonts/Helvetica.ttc",
	} {
		if _, e := os.Stat(p); e == nil {
			return p
		}
	}
	return ""
}

func GenerateInstallmentReceipt(cfg ReceiptConfig, plan *domain.InstallmentPlan, customer *domain.Customer, product *domain.Product, guarantors []domain.Guarantor) ([]byte, error) {
	const W = 800
	lh := 24.0
	lx := 45.0
	rx := 755.0
	sy := 120.0

	dr := 2 + 2 + 2 + 2 + len(guarantors)*3 + 2 + len(plan.Installments) + 1 + 8
	dc := gg.NewContext(W, int(sy+float64(dr)*lh+80))
	dc.SetRGB(1, 1, 1)
	dc.Clear()

	fp := getFontPath()

	// Header background
	dc.SetRGB(0.02, 0.08, 0.30)
	dc.DrawRectangle(0, 0, W, 105)
	dc.Fill()

	// Shop name
	dc.SetRGB(1, 1, 1)
	dc.LoadFontFace(fp, 22)
	dc.DrawStringAnchored(cfg.ShopName, W/2, 38, 0.5, 0.5)

	// Address
	dc.LoadFontFace(fp, 11)
	ay := 62.0
	for _, l := range splitLines(cfg.Address, 2) {
		dc.DrawStringAnchored(l, W/2, ay, 0.5, 0.5)
		ay += 16
	}

	// Title
	dc.LoadFontFace(fp, 13)
	dc.DrawStringAnchored("Installment Plan Receipt | قسط پلان رسید", W/2, 98, 0.5, 0.5)

	y := sy + 5

	// Helper: section header
	s := func(t string) {
		dc.SetRGB(0.90, 0.94, 1.0)
		dc.DrawRectangle(lx-5, y-3, rx-lx+10, lh+2)
		dc.Fill()
		dc.SetRGB(0.02, 0.08, 0.30)
		dc.LoadFontFace(fp, 11)
		dc.DrawString(t, lx, y+lh-9)
		y += lh + 6
	}

	// Helper: label-value line
	l := func(lb, v string) {
		dc.SetRGB(0.35, 0.35, 0.35)
		dc.LoadFontFace(fp, 10)
		dc.DrawString(lb, lx+8, y+lh-10)
		dc.SetRGB(0.05, 0.05, 0.05)
		dc.LoadFontFace(fp, 10)
		dc.DrawString(v, lx+175, y+lh-10)
		y += lh
	}

	// Customer details
	s("CUSTOMER DETAILS | گاہک کی معلومات")
	l("Name:", customer.Name)
	if customer.FatherName != "" {
		l("Father Name:", customer.FatherName)
	}
	if customer.NameUrdu != "" {
		l("Name (Urdu):", customer.NameUrdu)
	}
	l("Phone:", customer.Phone)
	if customer.CNIC != "" {
		l("CNIC:", customer.CNIC)
	}
	if customer.Address != "" {
		l("Address:", customer.Address)
	}

	// Product details
	s("PRODUCT DETAILS | پروڈکٹ کی معلومات")
	if product != nil {
		l("Product:", product.Name)
		if product.NameUrdu != "" {
			l("Product (Urdu):", product.NameUrdu)
		}
		if product.Company != "" {
			l("Company:", product.Company)
		}
	}
	if plan.SerialNumber != "" {
		l("Serial:", plan.SerialNumber)
	}
	if plan.IMEI != "" {
		l("IMEI:", plan.IMEI)
	}
	if plan.EngineNo != "" {
		l("Engine:", plan.EngineNo)
	}
	if plan.ChassisNo != "" {
		l("Chassis:", plan.ChassisNo)
	}
	if plan.Model != "" {
		l("Model:", plan.Model)
	}
	if plan.Color != "" {
		l("Color:", plan.Color)
	}
	l("Total:", fmt.Sprintf("Rs. %.2f", plan.TotalAmount))
	l("Down Payment:", fmt.Sprintf("Rs. %.2f", plan.DownPayment))
	l("Installment:", fmt.Sprintf("Rs. %.2f", plan.InstallmentAmount))
	l("Duration:", fmt.Sprintf("%d Months", plan.NumberOfInstallments))

	// Guarantor details
	if len(guarantors) > 0 {
		s("GUARANTOR DETAILS | ضامن کی معلومات")
		for _, g := range guarantors {
			l("Name:", g.Name)
			if g.Phone != "" {
				l("Phone:", g.Phone)
			}
			if g.Relation != "" {
				l("Relation:", g.Relation)
			}
			y += 4
		}
	}

	// Installment schedule
	s("INSTALLMENT SCHEDULE | قسطوں کی تفصیل")
	dc.SetRGB(0.5, 0.5, 0.5)
	dc.LoadFontFace(fp, 9)
	dc.DrawString("#", lx+10, y+lh-10)
	dc.DrawString("Due Date", lx+50, y+lh-10)
	dc.DrawString("Amount", lx+210, y+lh-10)
	dc.DrawString("Fine", lx+330, y+lh-10)
	dc.DrawString("Paid", lx+430, y+lh-10)
	dc.DrawString("Status", lx+530, y+lh-10)
	y += lh

	for _, inst := range plan.Installments {
		st := "Pending"
		sc := [3]float64{0.8, 0.3, 0.3}
		if inst.Paid {
			st = "Paid"
			sc = [3]float64{0.2, 0.7, 0.3}
		}

		pa := inst.PartialPaid
		if inst.Paid && inst.PartialPaid == 0 {
			pa = inst.Amount
		}

		dc.SetRGB(0.05, 0.05, 0.05)
		dc.LoadFontFace(fp, 9)
		dc.DrawString(fmt.Sprintf("%d", inst.InstallmentNo), lx+10, y+lh-10)
		dc.DrawString(inst.DueDate.Format("02-Jan-2006"), lx+50, y+lh-10)
		dc.DrawString(fmt.Sprintf("Rs. %.2f", inst.Amount), lx+210, y+lh-10)
		dc.DrawString(fmt.Sprintf("Rs. %.2f", inst.Fine), lx+330, y+lh-10)
		dc.DrawString(fmt.Sprintf("Rs. %.2f", pa), lx+430, y+lh-10)
		dc.SetRGB(sc[0], sc[1], sc[2])
		dc.DrawString(st, lx+530, y+lh-10)
		y += lh
	}

	// Payment summary
	y += 10
	dc.SetRGB(0.02, 0.08, 0.30)
	dc.LoadFontFace(fp, 11)
	dc.DrawString("PAYMENT SUMMARY | ادائیگی کا خلاصہ", lx, y)
	y += lh + 4

	tp, tf := 0.0, 0.0
	for _, i := range plan.Installments {
		if i.Paid {
			pa := i.PartialPaid
			if pa == 0 {
				pa = i.Amount
			}
			tp += pa
			tf += i.Fine
		}
	}

	dc.SetRGB(0.05, 0.05, 0.05)
	dc.LoadFontFace(fp, 10)
	dc.DrawString(fmt.Sprintf("Total Paid: Rs. %.2f", tp), lx+8, y+lh-10)
	dc.DrawString(fmt.Sprintf("Total Fine: Rs. %.2f", tf), lx+300, y+lh-10)
	y += lh

	r := plan.RemainingAmount - tp
	if r < 0 {
		r = 0
	}
	dc.DrawString(fmt.Sprintf("Remaining: Rs. %.2f", r), lx+8, y+lh-10)

	// Footer separator
	y += 20
	dc.SetRGB(0.7, 0.7, 0.7)
	dc.SetLineWidth(0.5)
	dc.DrawLine(lx, y-10, rx, y-10)
	dc.Stroke()

	// Shop address
	dc.SetRGB(0.3, 0.3, 0.3)
	dc.LoadFontFace(fp, 10)
	dc.DrawString("Shop Address:", lx, y)
	y += lh - 2
	dc.SetRGB(0.4, 0.4, 0.4)
	dc.LoadFontFace(fp, 9)
	for _, line := range splitLines(cfg.Address, 2) {
		dc.DrawString(line, lx, y)
		y += lh - 4
	}

	// Contact
	y += lh + 4
	dc.SetRGB(0.3, 0.3, 0.3)
	dc.LoadFontFace(fp, 10)
	dc.DrawString("Contact:", lx, y)
	y += lh - 2
	dc.SetRGB(0.4, 0.4, 0.4)
	dc.LoadFontFace(fp, 9)
	dc.DrawString(cfg.ContactPhones, lx, y)

	// Software by
	y += lh + 8
	dc.SetRGB(0.7, 0.7, 0.7)
	dc.SetLineWidth(0.5)
	dc.DrawLine(lx, y-6, rx, y-6)
	dc.Stroke()
	dc.SetRGB(0.55, 0.55, 0.55)
	dc.LoadFontFace(fp, 9)
	dc.DrawString(fmt.Sprintf("Generated: %s", time.Now().Format("02-Jan-2006 03:04 PM")), lx, y)

	y += lh + 4
	dc.SetRGB(0.02, 0.08, 0.30)
	dc.SetLineWidth(1.5)
	dc.DrawRectangle(lx-5, y-5, rx-lx+10, lh+14)
	dc.Fill()
	dc.SetRGB(1, 1, 1)
	dc.LoadFontFace(fp, 11)
	dc.DrawStringAnchored("Software by: "+cfg.SoftwareBy, W/2, y+lh/2+2, 0.5, 0.5)

	// Thank you message
	y += lh + 12
	dc.SetRGB(0.6, 0.6, 0.6)
	dc.LoadFontFace(fp, 8)
	dc.DrawString(cfg.ThankYouMsg+" | "+cfg.ThankYouMsgUr, lx, y)

	var buf bytes.Buffer
	jpeg.Encode(&buf, dc.Image(), &jpeg.Options{Quality: 95})
	return buf.Bytes(), nil
}