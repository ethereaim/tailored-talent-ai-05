export type JobData = {
  title: string;
  company: string;
  location: string;
  employment_type: string;
  responsibilities: string[];
  requirements: string[];
  skills: string[];
  keywords: string[];
};

export type CvExperience = {
  company: string;
  position: string;
  period: string;
  bullets: string[];
};

export type CvEducation = {
  institution: string;
  degree: string;
  period: string;
  details: string;
};

export type TailoredCv = {
  name: string;
  headline: string;
  contact: {
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    portfolio: string;
  };
  summary: string;
  experiences: CvExperience[];
  education: CvEducation[];
  hard_skills: string[];
  soft_skills: string[];
  certifications: { name: string; detail: string }[];
};

export type TailorResult = {
  id: string;
  match_score: number;
  missing_skills: string[];
  highlights: string[];
  cv: TailoredCv;
};

export const emptyJob: JobData = {
  title: "",
  company: "",
  location: "",
  employment_type: "",
  responsibilities: [],
  requirements: [],
  skills: [],
  keywords: [],
};
