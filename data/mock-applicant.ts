import type { Applicant } from "@/types";
import { APPLICANT_WALLET } from "@/lib/constants";

export const mockApplicant: Applicant = {
  name: "Jua Kali Leather Works",
  owner: "J. Kamau",
  initials: "JK",
  sector: "Leather Goods",
  location: "Nairobi, Kenya",
  walletAddress: APPLICANT_WALLET,
  network: "Avalanche",
};
