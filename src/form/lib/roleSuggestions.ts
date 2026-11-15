/**
 * 196 подсказок должностей (`Ze` в чанке) + ghost-text prefix match (`Be`/`Qe`).
 */
export const ROLE_SUGGESTIONS: readonly string[] = [
  "Founder", "Co-founder", "Board Member", "Chair", "Managing Director",
  "Managing Partner", "Partner", "President", "Chief Executive Officer",
  "Chief Operating Officer", "Chief Financial Officer", "Chief Technology Officer",
  "Chief Information Officer", "Chief Digital Officer", "Chief Product Officer",
  "Chief Design Officer", "Chief Marketing Officer", "Chief Strategy Officer",
  "Chief Innovation Officer", "Chief AI Officer", "Chief Transformation Officer",
  "Chief Customer Officer", "Chief Experience Officer", "Chief People Officer",
  "Chief Medical Officer", "Chief Nursing Officer", "General Counsel",
  "CEO", "COO", "CFO", "CTO", "CIO", "CDO", "CPO", "CMO",
  "Executive Vice President", "Senior Vice President", "Vice President",
  "VP of Product", "VP of Design", "VP of Engineering", "VP of Technology",
  "VP of Digital", "VP of Data", "VP of AI", "VP of Innovation",
  "VP of Strategy", "VP of Transformation", "VP of Operations",
  "VP of Marketing", "VP of Customer Experience", "VP of Legal",
  "VP of Procurement", "Head of Product", "Head of Design",
  "Head of Engineering", "Head of Technology", "Head of IT", "Head of Digital",
  "Head of Data", "Head of AI", "Head of Innovation", "Head of Strategy",
  "Head of Transformation", "Head of Operations", "Head of Brand",
  "Head of Marketing", "Head of Customer Experience", "Head of Research",
  "Head of Legal", "Head of Legal Operations", "Head of Compliance",
  "Head of Risk", "Head of Procurement", "Head of Sustainability",
  "Head of Information Security", "Head of People", "Head of Retail",
  "Head of Ecommerce", "Head of Mobility", "Group Director",
  "Regional Director", "Country Director", "General Manager",
  "Programme Director", "Program Director", "Product Director",
  "Design Director", "Engineering Director", "Technology Director",
  "IT Director", "Digital Director", "Data Director", "AI Director",
  "Innovation Director", "Strategy Director", "Transformation Director",
  "Operations Director", "Brand Director", "Marketing Director",
  "Customer Experience Director", "Research Director", "Legal Director",
  "Legal Operations Director", "Compliance Director", "Risk Director",
  "Procurement Director", "Sustainability Director",
  "Information Security Director", "People Director", "HR Director",
  "Retail Director", "Ecommerce Director", "Mobility Director",
  "Medical Director", "Clinical Director", "Digital Health Director",
  "Real Estate Director", "Property Director", "Supply Chain Director",
  "Product Manager", "Senior Product Manager", "Product Lead",
  "Programme Manager", "Program Manager", "Project Manager",
  "Digital Transformation Manager", "Innovation Manager", "Strategy Manager",
  "Operations Manager", "Brand Manager", "Marketing Manager",
  "Customer Experience Manager", "Legal Operations Manager",
  "Procurement Manager", "Category Manager", "Partnerships Manager",
  "Business Development Manager", "Product Designer", "Principal Designer",
  "Lead Product Designer", "UX Designer", "UX Researcher", "Service Designer",
  "Industrial Designer", "Brand Designer", "Content Designer",
  "Design Engineer", "Design Lead", "Creative Director", "Art Director",
  "Enterprise Architect", "Solutions Architect", "Software Architect",
  "Software Engineer", "Engineering Manager", "Tech Lead", "Staff Engineer",
  "Principal Engineer", "Frontend Engineer", "Backend Engineer",
  "Full-stack Engineer", "AI Engineer", "Machine Learning Engineer",
  "Data Scientist", "Data Engineer", "Security Engineer",
  "Clinical Innovation Lead", "Digital Health Lead", "Legal Innovation Lead",
  "Innovation Lawyer", "Knowledge Director", "Associate", "Senior Associate",
  "Student",
];

/** Первый suggestion, у которого ввод — префикс (case-insensitive) (`Be`). */
export function matchRole(input: string): string | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;
  return ROLE_SUGGESTIONS.find((r) => r.toLowerCase().startsWith(q)) ?? null;
}

/** Канонизация роли перед отправкой: suggestion или trimmed ввод (`Qe`). */
export function canonicalizeRole(input: string): string {
  return matchRole(input) ?? input.trim();
}
