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

export type VaultImportData = {
  profile: {
    full_name: string;
    email: string;
    phone: string;
    location: string;
    linkedin_url: string;
    portfolio_url: string;
    summary: string;
  };
  work_experiences: {
    company: string;
    position: string;
    start_date: string;
    end_date: string;
    description: string;
    achievements: string;
  }[];
  educations: {
    institution: string;
    degree: string;
    field: string;
    start_year: string;
    end_year: string;
    gpa: string;
    activities: string;
  }[];
  skills: { name: string; category: string; level: string }[];
  credentials: { kind: string; name: string; description: string; year: string; link: string }[];
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
