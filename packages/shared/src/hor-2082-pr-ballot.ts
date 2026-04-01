/**
 * HoR 2082 proportional (PR) ballot — full party list with votes and allocated PR seats.
 * Source: published EC / public results tables (e.g. Nepse Bajar PR tally, March 2026).
 * Sum of {@link HOR_2082_PR_BALLOT_ROWS} prVotes = {@link HOR_2082_PR_BALLOT_VOTE_TOTAL}.
 */

export const HOR_2082_PR_BALLOT_VOTE_TOTAL = 10_789_078;

export type Hor2082PrBallotRow = {
  partyId: string;
  partyName: string;
  partyShortName: string;
  partyColor: string;
  prVotes: number;
  /** Seats allocated from the national PR pool (110). */
  prSeats: number;
};

/** Full PR ballot (57 registered PR lists). Order: highest votes first. */
export const HOR_2082_PR_BALLOT_ROWS: Hor2082PrBallotRow[] = [
  { partyId: "rsp", partyName: "Rastriya Swatantra Party", partyShortName: "RSP", partyColor: "#1a97d5", prVotes: 5_158_810, prSeats: 57 },
  { partyId: "nc", partyName: "Nepali Congress", partyShortName: "NC", partyColor: "#3f653b", prVotes: 1_756_043, prSeats: 20 },
  { partyId: "ncp-uml", partyName: "Nepal Communist Party (UML)", partyShortName: "UML", partyColor: "#ee1c25", prVotes: 1_452_939, prSeats: 16 },
  { partyId: "ncp-nepal", partyName: "Nepali Communist Party", partyShortName: "NCP", partyColor: "#b91c1c", prVotes: 809_641, prSeats: 9 },
  { partyId: "ssp", partyName: "Shram Sanskriti Party", partyShortName: "SSP", partyColor: "#ca8a04", prVotes: 385_748, prSeats: 4 },
  { partyId: "rppp", partyName: "Rastriya Prajatantra Party", partyShortName: "RPP", partyColor: "#f97316", prVotes: 330_281, prSeats: 4 },
  { partyId: "jspn", partyName: "Janata Samajwadi Party, Nepal", partyShortName: "JSPN", partyColor: "#c2410c", prVotes: 177_346, prSeats: 0 },
  { partyId: "rppa-parivartan", partyName: "Rastriya Parivartan Party", partyShortName: "RPPA", partyColor: "#78716c", prVotes: 172_066, prSeats: 0 },
  { partyId: "janamat", partyName: "Janamat Party", partyShortName: "Janamat", partyColor: "#0d9488", prVotes: 79_148, prSeats: 0 },
  { partyId: "pr-coal-chakiya", partyName: "Joint list (Chakiya symbol)", partyShortName: "Joint Chakiya", partyColor: "#64748b", prVotes: 61_817, prSeats: 0 },
  { partyId: "nmjkp", partyName: "Nepal Majdur Kisan Party", partyShortName: "NMKP", partyColor: "#7c3aed", prVotes: 42_261, prSeats: 0 },
  { partyId: "nbtn", partyName: "Nation Building Team Nepal", partyShortName: "NBTN", partyColor: "#64748b", prVotes: 39_160, prSeats: 0 },
  { partyId: "rjm", partyName: "Rastriya Janamorcha", partyShortName: "RJM", partyColor: "#b45309", prVotes: 29_448, prSeats: 0 },
  { partyId: "pr-coal-bus", partyName: "Joint list (Bus symbol)", partyShortName: "Joint Bus", partyColor: "#64748b", prVotes: 28_761, prSeats: 0 },
  { partyId: "njsp", partyName: "Nepal Janata Sanrakshan Party", partyShortName: "NJSP", partyColor: "#64748b", prVotes: 28_257, prSeats: 0 },
  { partyId: "pdp", partyName: "Progressive Democratic Party", partyShortName: "PDP", partyColor: "#64748b", prVotes: 24_648, prSeats: 0 },
  { partyId: "ncp-maoist", partyName: "Nepal Communist Party (Maoist)", partyShortName: "NCP (M)", partyColor: "#dc2626", prVotes: 23_852, prSeats: 0 },
  { partyId: "mongol", partyName: "Mongol National Organization", partyShortName: "Mongol", partyColor: "#64748b", prVotes: 20_816, prSeats: 0 },
  { partyId: "pr-coal-mobile", partyName: "Joint list (Mobile symbol)", partyShortName: "Joint Mobile", partyColor: "#64748b", prVotes: 15_246, prSeats: 0 },
  { partyId: "sarbabhaum", partyName: "Sarbabhaum Nagarik Party", partyShortName: "Sarbabhaum", partyColor: "#64748b", prVotes: 14_854, prSeats: 0 },
  { partyId: "rma-nepal", partyName: "Rastriya Mukti Andolan, Nepal", partyShortName: "RMA", partyColor: "#64748b", prVotes: 10_704, prSeats: 0 },
  { partyId: "united-nagarik", partyName: "United Nagarik Party", partyShortName: "UNP", partyColor: "#64748b", prVotes: 9_103, prSeats: 0 },
  { partyId: "swabhiman", partyName: "Swabhiman Party", partyShortName: "Swabhiman", partyColor: "#64748b", prVotes: 8_152, prSeats: 0 },
  { partyId: "rastriya-janmukti", partyName: "Rastriya Janmukti Party", partyShortName: "RJP", partyColor: "#64748b", prVotes: 7_208, prSeats: 0 },
  { partyId: "nepal-janata", partyName: "Nepal Janata Party", partyShortName: "NJP", partyColor: "#64748b", prVotes: 7_157, prSeats: 0 },
  { partyId: "rastriya-ekta", partyName: "Rastriya Ekta Dal", partyShortName: "RED", partyColor: "#64748b", prVotes: 7_060, prSeats: 0 },
  { partyId: "ncp-ml", partyName: "Nepal Communist Party (Marxist Leninist)", partyShortName: "NCP (ML)", partyColor: "#64748b", prVotes: 6_163, prSeats: 0 },
  { partyId: "rastriya-gaurav", partyName: "Rastriya Gaurav Party", partyShortName: "RGP", partyColor: "#64748b", prVotes: 5_244, prSeats: 0 },
  { partyId: "national-republic", partyName: "National Republic Nepal", partyShortName: "NRN", partyColor: "#64748b", prVotes: 5_158, prSeats: 0 },
  { partyId: "nkl-nepali", partyName: "Nepal Ka Lagi Nepali Party", partyShortName: "NKL", partyColor: "#64748b", prVotes: 5_010, prSeats: 0 },
  { partyId: "ncp-pushpalal", partyName: "Nepal Communist Party Marxist (Pushpalal)", partyShortName: "NCP (P)", partyColor: "#64748b", prVotes: 4_827, prSeats: 0 },
  { partyId: "federal-forum", partyName: "Federal Democratic National Forum", partyShortName: "FDNF", partyColor: "#64748b", prVotes: 4_671, prSeats: 0 },
  { partyId: "ncp-united", partyName: "Nepal Communist Party (United)", partyShortName: "NCP (U)", partyColor: "#64748b", prVotes: 4_510, prSeats: 0 },
  { partyId: "gatishil-dem", partyName: "Gatishil Democratic Party", partyShortName: "GDP", partyColor: "#64748b", prVotes: 4_505, prSeats: 0 },
  { partyId: "rastriya-urjashil", partyName: "Rastriya Urjashil Party, Nepal", partyShortName: "RUP", partyColor: "#64748b", prVotes: 4_315, prSeats: 0 },
  { partyId: "samaveshi-sn", partyName: "Samaveshi Samajwadi Party Nepal", partyShortName: "SSPN", partyColor: "#64748b", prVotes: 4_272, prSeats: 0 },
  { partyId: "nepal-loktantrik", partyName: "Nepal Loktantrik Party", partyShortName: "NLP", partyColor: "#64748b", prVotes: 4_108, prSeats: 0 },
  { partyId: "nepal-matribhumi", partyName: "Nepal Matribhumi Party", partyShortName: "NMP", partyColor: "#64748b", prVotes: 3_224, prSeats: 0 },
  { partyId: "jai-matribhumi", partyName: "Jai Matribhumi Party", partyShortName: "JMP", partyColor: "#64748b", prVotes: 2_976, prSeats: 0 },
  { partyId: "rastriya-janata-nepal", partyName: "Rastriya Janata Party Nepal", partyShortName: "RJPN", partyColor: "#64748b", prVotes: 2_930, prSeats: 0 },
  { partyId: "bahujan-shakti", partyName: "Bahujan Shakti Party", partyShortName: "BSP", partyColor: "#64748b", prVotes: 2_754, prSeats: 0 },
  { partyId: "democratic-nepal", partyName: "Democratic Party Nepal", partyShortName: "DPN", partyColor: "#64748b", prVotes: 2_239, prSeats: 0 },
  { partyId: "nepal-janmukti", partyName: "Nepal Janmukti Party", partyShortName: "NJM", partyColor: "#64748b", prVotes: 2_168, prSeats: 0 },
  { partyId: "jan-adhikar", partyName: "Jan Adhikar Party", partyShortName: "JAP", partyColor: "#64748b", prVotes: 2_110, prSeats: 0 },
  { partyId: "nepal-sadbhawana", partyName: "Nepal Sadbhawana Party", partyShortName: "NSP", partyColor: "#64748b", prVotes: 2_015, prSeats: 0 },
  { partyId: "people-first", partyName: "People First Party", partyShortName: "PFP", partyColor: "#64748b", prVotes: 1_798, prSeats: 0 },
  { partyId: "nc-bp", partyName: "Nepali Congress (B.P.)", partyShortName: "NC (BP)", partyColor: "#64748b", prVotes: 1_785, prSeats: 0 },
  { partyId: "nagarik-shakti", partyName: "Nagarik Shakti, Nepal", partyShortName: "NS", partyColor: "#64748b", prVotes: 1_727, prSeats: 0 },
  { partyId: "nepal-janashramdan", partyName: "Nepali Janashramdan Sanskriti Party", partyShortName: "NJSS", partyColor: "#64748b", prVotes: 1_637, prSeats: 0 },
  { partyId: "nepal-janata-dal", partyName: "Nepali Janata Dal", partyShortName: "NJD", partyColor: "#64748b", prVotes: 1_451, prSeats: 0 },
  { partyId: "samaveshi-samajwadi", partyName: "Samaveshi Samajwadi Party", partyShortName: "Samaveshi", partyColor: "#64748b", prVotes: 1_393, prSeats: 0 },
  { partyId: "janata-dem-nepal", partyName: "Janata Democratic Party, Nepal", partyShortName: "JDPN", partyColor: "#64748b", prVotes: 1_300, prSeats: 0 },
  { partyId: "pr-coal-jagat", partyName: "Joint list (Jagat symbol)", partyShortName: "Joint Jagat", partyColor: "#64748b", prVotes: 1_127, prSeats: 0 },
  { partyId: "janpriya-loktantrik", partyName: "Janpriya Loktantrik Party", partyShortName: "JLP", partyColor: "#64748b", prVotes: 951, prSeats: 0 },
  { partyId: "miteri-nepal", partyName: "Miteri Party Nepal", partyShortName: "Miteri", partyColor: "#64748b", prVotes: 769, prSeats: 0 },
  { partyId: "unnat-loktantra", partyName: "Unnat Loktantra Party", partyShortName: "ULP", partyColor: "#64748b", prVotes: 724, prSeats: 0 },
  { partyId: "trimul-nepal", partyName: "Trimul Nepal", partyShortName: "Trimul", partyColor: "#64748b", prVotes: 691, prSeats: 0 },
];
