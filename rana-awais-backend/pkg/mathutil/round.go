package mathutil

import "math"

// RoundTo2 rounds a float64 to 2 decimal places (paise/cents precision)
func RoundTo2(val float64) float64 {
	return math.Round(val*100) / 100
}

// RoundTo0 rounds a float64 to 0 decimal places (integer)
func RoundTo0(val float64) float64 {
	return math.Round(val)
}

// RoundToN rounds a float64 to N decimal places
func RoundToN(val float64, n int) float64 {
	pow := math.Pow(10, float64(n))
	return math.Round(val*pow) / pow
}

// Max returns the larger of two float64 values
func Max(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

// Min returns the smaller of two float64 values
func Min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

// Clamp clamps a value between min and max
func Clamp(val, min, max float64) float64 {
	if val < min {
		return min
	}
	if val > max {
		return max
	}
	return val
}

// SafeDivide divides a by b, returning 0 if b is 0
func SafeDivide(a, b float64) float64 {
	if b == 0 {
		return 0
	}
	return a / b
}

// RoundMoney rounds to 2 decimal places (standard money rounding)
func RoundMoney(val float64) float64 {
	return RoundTo2(val)
}
