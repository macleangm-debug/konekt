/**
 * Full country dataset — ISO2, name, dial code, flag emoji, phone placeholder.
 * Sorted: East Africa first (TZ default), then alphabetical.
 */
const EA_CODES = ["TZ", "KE", "UG", "RW", "BI", "CD", "ET", "SO", "MW", "MZ", "ZM"];

const ALL_COUNTRIES = [
  { iso2: "TZ", name: "Tanzania", dial: "+255", flag: "\u{1F1F9}\u{1F1FF}", ph: "712345678" },
  { iso2: "KE", name: "Kenya", dial: "+254", flag: "\u{1F1F0}\u{1F1EA}", ph: "712345678" },
  { iso2: "UG", name: "Uganda", dial: "+256", flag: "\u{1F1FA}\u{1F1EC}", ph: "712345678" },
  { iso2: "RW", name: "Rwanda", dial: "+250", flag: "\u{1F1F7}\u{1F1FC}", ph: "712345678" },
  { iso2: "BI", name: "Burundi", dial: "+257", flag: "\u{1F1E7}\u{1F1EE}", ph: "71234567" },
  { iso2: "CD", name: "DR Congo", dial: "+243", flag: "\u{1F1E8}\u{1F1E9}", ph: "812345678" },
  { iso2: "ET", name: "Ethiopia", dial: "+251", flag: "\u{1F1EA}\u{1F1F9}", ph: "912345678" },
  { iso2: "SO", name: "Somalia", dial: "+252", flag: "\u{1F1F8}\u{1F1F4}", ph: "612345678" },
  { iso2: "MW", name: "Malawi", dial: "+265", flag: "\u{1F1F2}\u{1F1FC}", ph: "991234567" },
  { iso2: "MZ", name: "Mozambique", dial: "+258", flag: "\u{1F1F2}\u{1F1FF}", ph: "841234567" },
  { iso2: "ZM", name: "Zambia", dial: "+260", flag: "\u{1F1FF}\u{1F1F2}", ph: "961234567" },
  // Rest of Africa
  { iso2: "ZA", name: "South Africa", dial: "+27", flag: "\u{1F1FF}\u{1F1E6}", ph: "712345678" },
  { iso2: "NG", name: "Nigeria", dial: "+234", flag: "\u{1F1F3}\u{1F1EC}", ph: "8012345678" },
  { iso2: "GH", name: "Ghana", dial: "+233", flag: "\u{1F1EC}\u{1F1ED}", ph: "241234567" },
  { iso2: "EG", name: "Egypt", dial: "+20", flag: "\u{1F1EA}\u{1F1EC}", ph: "1012345678" },
  { iso2: "MA", name: "Morocco", dial: "+212", flag: "\u{1F1F2}\u{1F1E6}", ph: "612345678" },
  { iso2: "DZ", name: "Algeria", dial: "+213", flag: "\u{1F1E9}\u{1F1FF}", ph: "551234567" },
  { iso2: "TN", name: "Tunisia", dial: "+216", flag: "\u{1F1F9}\u{1F1F3}", ph: "21234567" },
  { iso2: "SN", name: "Senegal", dial: "+221", flag: "\u{1F1F8}\u{1F1F3}", ph: "771234567" },
  { iso2: "CI", name: "Ivory Coast", dial: "+225", flag: "\u{1F1E8}\u{1F1EE}", ph: "0712345678" },
  { iso2: "CM", name: "Cameroon", dial: "+237", flag: "\u{1F1E8}\u{1F1F2}", ph: "671234567" },
  { iso2: "AO", name: "Angola", dial: "+244", flag: "\u{1F1E6}\u{1F1F4}", ph: "912345678" },
  { iso2: "ZW", name: "Zimbabwe", dial: "+263", flag: "\u{1F1FF}\u{1F1FC}", ph: "712345678" },
  { iso2: "BW", name: "Botswana", dial: "+267", flag: "\u{1F1E7}\u{1F1FC}", ph: "71234567" },
  { iso2: "NA", name: "Namibia", dial: "+264", flag: "\u{1F1F3}\u{1F1E6}", ph: "811234567" },
  // Middle East
  { iso2: "AE", name: "UAE", dial: "+971", flag: "\u{1F1E6}\u{1F1EA}", ph: "501234567" },
  { iso2: "SA", name: "Saudi Arabia", dial: "+966", flag: "\u{1F1F8}\u{1F1E6}", ph: "512345678" },
  { iso2: "OM", name: "Oman", dial: "+968", flag: "\u{1F1F4}\u{1F1F2}", ph: "91234567" },
  { iso2: "QA", name: "Qatar", dial: "+974", flag: "\u{1F1F6}\u{1F1E6}", ph: "31234567" },
  // Asia
  { iso2: "IN", name: "India", dial: "+91", flag: "\u{1F1EE}\u{1F1F3}", ph: "9123456789" },
  { iso2: "CN", name: "China", dial: "+86", flag: "\u{1F1E8}\u{1F1F3}", ph: "13123456789" },
  { iso2: "PK", name: "Pakistan", dial: "+92", flag: "\u{1F1F5}\u{1F1F0}", ph: "3001234567" },
  { iso2: "BD", name: "Bangladesh", dial: "+880", flag: "\u{1F1E7}\u{1F1E9}", ph: "1712345678" },
  { iso2: "PH", name: "Philippines", dial: "+63", flag: "\u{1F1F5}\u{1F1ED}", ph: "9171234567" },
  { iso2: "JP", name: "Japan", dial: "+81", flag: "\u{1F1EF}\u{1F1F5}", ph: "9012345678" },
  { iso2: "KR", name: "South Korea", dial: "+82", flag: "\u{1F1F0}\u{1F1F7}", ph: "1012345678" },
  { iso2: "SG", name: "Singapore", dial: "+65", flag: "\u{1F1F8}\u{1F1EC}", ph: "81234567" },
  { iso2: "MY", name: "Malaysia", dial: "+60", flag: "\u{1F1F2}\u{1F1FE}", ph: "121234567" },
  { iso2: "TH", name: "Thailand", dial: "+66", flag: "\u{1F1F9}\u{1F1ED}", ph: "812345678" },
  // Europe
  { iso2: "GB", name: "United Kingdom", dial: "+44", flag: "\u{1F1EC}\u{1F1E7}", ph: "7911123456" },
  { iso2: "DE", name: "Germany", dial: "+49", flag: "\u{1F1E9}\u{1F1EA}", ph: "15112345678" },
  { iso2: "FR", name: "France", dial: "+33", flag: "\u{1F1EB}\u{1F1F7}", ph: "612345678" },
  { iso2: "IT", name: "Italy", dial: "+39", flag: "\u{1F1EE}\u{1F1F9}", ph: "3121234567" },
  { iso2: "ES", name: "Spain", dial: "+34", flag: "\u{1F1EA}\u{1F1F8}", ph: "612345678" },
  { iso2: "NL", name: "Netherlands", dial: "+31", flag: "\u{1F1F3}\u{1F1F1}", ph: "612345678" },
  { iso2: "SE", name: "Sweden", dial: "+46", flag: "\u{1F1F8}\u{1F1EA}", ph: "701234567" },
  { iso2: "NO", name: "Norway", dial: "+47", flag: "\u{1F1F3}\u{1F1F4}", ph: "41234567" },
  { iso2: "CH", name: "Switzerland", dial: "+41", flag: "\u{1F1E8}\u{1F1ED}", ph: "781234567" },
  { iso2: "PT", name: "Portugal", dial: "+351", flag: "\u{1F1F5}\u{1F1F9}", ph: "912345678" },
  { iso2: "PL", name: "Poland", dial: "+48", flag: "\u{1F1F5}\u{1F1F1}", ph: "512345678" },
  { iso2: "TR", name: "Turkey", dial: "+90", flag: "\u{1F1F9}\u{1F1F7}", ph: "5321234567" },
  // Americas
  { iso2: "US", name: "United States", dial: "+1", flag: "\u{1F1FA}\u{1F1F8}", ph: "2025551234" },
  { iso2: "CA", name: "Canada", dial: "+1", flag: "\u{1F1E8}\u{1F1E6}", ph: "4161234567" },
  { iso2: "BR", name: "Brazil", dial: "+55", flag: "\u{1F1E7}\u{1F1F7}", ph: "11912345678" },
  { iso2: "MX", name: "Mexico", dial: "+52", flag: "\u{1F1F2}\u{1F1FD}", ph: "5512345678" },
  { iso2: "CO", name: "Colombia", dial: "+57", flag: "\u{1F1E8}\u{1F1F4}", ph: "3101234567" },
  { iso2: "AR", name: "Argentina", dial: "+54", flag: "\u{1F1E6}\u{1F1F7}", ph: "1112345678" },
  // Oceania
  { iso2: "AU", name: "Australia", dial: "+61", flag: "\u{1F1E6}\u{1F1FA}", ph: "412345678" },
  { iso2: "NZ", name: "New Zealand", dial: "+64", flag: "\u{1F1F3}\u{1F1FF}", ph: "211234567" },
];

export { ALL_COUNTRIES, EA_CODES };
export default ALL_COUNTRIES;
