/**
 * Случайные "персоны"-плейсхолдеры (`it`, `lt`, `Me`, `ct` в чанке):
 * подставляются в placeholder полей name/email. Два списка — женщины/мужчины.
 */
export interface SamplePersona {
  name: string;
  email: string;
}

export const PERSONAS_A: readonly SamplePersona[] = [
  { name: "Ada Lovelace", email: "alovelace@analyticalengine.co.uk" },
  { name: "Grace Hopper", email: "ghopper@navy.mil" },
  { name: "Jean Bartik", email: "jbartik@upenn.edu" },
  { name: "Kay McNulty", email: "kmcnulty@upenn.edu" },
  { name: "Jean Sammet", email: "jsammet@ibm.com" },
  { name: "Mary Coombs", email: "mcoombs@leo.co.uk" },
  { name: "Ida Rhodes", email: "irhodes@nist.gov" },
  { name: "Joan Clarke", email: "jclarke@bletchleypark.org.uk" },
  { name: "Lois Haibt", email: "lhaibt@ibm.com" },
  { name: "Klara Dan", email: "kdan@lanl.gov" },
  { name: "Mina Rees", email: "mrees@onr.navy.mil" },
  { name: "Maggie Boden", email: "mboden@sussex.ac.uk" },
];

export const PERSONAS_B: readonly SamplePersona[] = [
  { name: "Alan Turing", email: "aturing@bletchleypark.org.uk" },
  { name: "Allen Newell", email: "anewell@cmu.edu" },
  { name: "Saul Amarel", email: "samarel@rutgers.edu" },
  { name: "Nils Nilsson", email: "nnilsson@stanford.edu" },
  { name: "Lotfi Zadeh", email: "lzadeh@berkeley.edu" },
  { name: "Walter Pitts", email: "wpitts@mit.edu" },
  { name: "Ross Ashby", email: "rashby@burdenneurological.co.uk" },
  { name: "Grey Walter", email: "gwalter@burdenneurological.co.uk" },
  { name: "Don Michie", email: "dmichie@ed.ac.uk" },
  { name: "Max Clowes", email: "mclowes@sussex.ac.uk" },
  { name: "Roger Schank", email: "rschank@yale.edu" },
  { name: "Jim Slagle", email: "jslagle@mit.edu" },
];

export const ALL_PERSONAS: readonly SamplePersona[] = [
  ...PERSONAS_A,
  ...PERSONAS_B,
];

export function randomPersona(
  rand: () => number = Math.random,
): SamplePersona {
  const index = Math.floor(rand() * ALL_PERSONAS.length);
  return ALL_PERSONAS[Math.min(index, ALL_PERSONAS.length - 1)];
}
