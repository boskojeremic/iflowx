import { db } from "@/lib/db";

type TemplateFieldLite = {
  code: string;
  label: string;
  sectionCode: string | null;
  unit: string | null;
};

function toUtcDayBounds(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  const start = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 23, 59, 59, 999));
  return { start, end };
}

function ageOnDate(birthDate: Date | null | undefined, asOf: Date) {
  if (!birthDate) return null;

  let age = asOf.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = asOf.getUTCMonth() - birthDate.getUTCMonth();
  const dayDiff = asOf.getUTCDate() - birthDate.getUTCDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age;
}

function normalizeNumber(n: unknown) {
  const x = Number(n ?? 0);
  return Number.isFinite(x) ? x : 0;
}

export async function getWorkforceReportData(params: {
  tenantId: string;
  reportDate: string;
  templateFields: TemplateFieldLite[];
}) {
  const { tenantId, reportDate, templateFields } = params;
  const { start, end } = toUtcDayBounds(reportDate);

  const employees = await db.employee.findMany({
    where: {
      tenantId,
      AND: [
        { OR: [{ hireDate: null }, { hireDate: { lte: end } }] },
        { OR: [{ exitDate: null }, { exitDate: { gte: start } }] },
      ],
    },
    select: {
      id: true,
      gender: true,
      birthDate: true,
      employmentType: true,
    },
  });

  const employeeIds = employees.map((e) => e.id);

  const allTrainingRecords =
    employeeIds.length > 0
      ? await db.employeeTrainingRecord.findMany({
          where: {
            tenantId,
            employeeId: { in: employeeIds },
            OR: [{ trainingDate: null }, { trainingDate: { lte: end } }],
          },
          select: {
            id: true,
            employeeId: true,
            trainingDate: true,
            expiryDate: true,
            hours: true,
            status: true,
          },
        })
      : [];

  const validTrainingRecords = allTrainingRecords.filter((r) => {
    const trained = !r.trainingDate || r.trainingDate <= end;
    const notExpired = !r.expiryDate || r.expiryDate >= start;
    return trained && notExpired;
  });

  const expiredTrainingRecords = allTrainingRecords.filter((r) => {
    const trained = !r.trainingDate || r.trainingDate <= end;
    const expired = !!r.expiryDate && r.expiryDate < start;
    return trained && expired;
  });

  const plannedTrainingRecords = allTrainingRecords.filter(
    (r) => r.status === "PLANNED" && (!r.trainingDate || r.trainingDate > end)
  );

  const completedTrainingRecords = allTrainingRecords.filter((r) => {
    const trained = !!r.trainingDate && r.trainingDate <= end;
    return trained || r.status === "COMPLETED";
  });

  const trainedEmployees = new Set(
    validTrainingRecords.map((r) => r.employeeId)
  ).size;

  const trainingRecordCount = validTrainingRecords.length;

  const trainingHours = allTrainingRecords
    .filter((r) => !r.trainingDate || r.trainingDate <= end)
    .reduce((sum, r) => sum + normalizeNumber(r.hours), 0);

  const yearStart = new Date(
    Date.UTC(start.getUTCFullYear(), 0, 1, 0, 0, 0, 0)
  );

  const hseRecordsYtd = await db.employeeHseRecord.findMany({
  where: {
    tenantId,
    eventDate: {
      gte: yearStart,
      lte: end,
    },
  },
  select: {
    id: true,
    eventType: true,
    lostTimeDays: true,
  },
});

  const totalEmployees = employees.length;
  const permanentEmployees = employees.filter(
    (e) => e.employmentType === "PERMANENT"
  ).length;
  const contractorEmployees = employees.filter(
    (e) => e.employmentType === "CONTRACTOR"
  ).length;
  const temporaryEmployees = employees.filter(
    (e) => e.employmentType === "TEMPORARY"
  ).length;
  const internEmployees = employees.filter(
    (e) => e.employmentType === "INTERN"
  ).length;

  const maleEmployees = employees.filter((e) => e.gender === "MALE").length;
  const femaleEmployees = employees.filter((e) => e.gender === "FEMALE").length;
  const otherGenderEmployees = employees.filter(
    (e) => e.gender === "OTHER" || e.gender === "UNDISCLOSED"
  ).length;

  const ages = employees
    .map((e) => ageOnDate(e.birthDate, end))
    .filter((a): a is number => a !== null);

  const ageLt30 = ages.filter((a) => a < 30).length;
  const age30to50 = ages.filter((a) => a >= 30 && a <= 50).length;
  const ageGt50 = ages.filter((a) => a > 50).length;

  const trainingTotal = allTrainingRecords.length;
  const trainingValid = validTrainingRecords.length;
  const trainingExpired = expiredTrainingRecords.length;
  const trainingPlanned = plannedTrainingRecords.length;
  const trainingCompleted = completedTrainingRecords.length;

  const hseTotal = hseRecordsYtd.length;
  const hseIncident = hseRecordsYtd.filter(
    (r) => r.eventType === "INCIDENT"
  ).length;
  const hseNearMiss = hseRecordsYtd.filter(
    (r) => r.eventType === "NEAR_MISS"
  ).length;
  const hseInjury = hseRecordsYtd.filter(
    (r) => r.eventType === "INJURY"
  ).length;
  const hseLti = hseRecordsYtd.filter(
    (r) => r.eventType === "LOST_TIME_INJURY"
  ).length;
  const hseMedical = hseRecordsYtd.filter(
    (r) => r.eventType === "MEDICAL_TREATMENT"
  ).length;
  const hseFirstAid = hseRecordsYtd.filter(
    (r) => r.eventType === "FIRST_AID"
  ).length;
  const hseLostDays = hseRecordsYtd.reduce(
    (sum, r) => sum + normalizeNumber(r.lostTimeDays),
    0
  );

  function resolveFieldValue(field: TemplateFieldLite) {
    const code = (field.code || "").toUpperCase();

    switch (code) {
      case "TOTAL_EMP":
        return String(totalEmployees);
      case "PERM_EMP":
        return String(permanentEmployees);
      case "CONT_EMP":
        return String(contractorEmployees);
      case "TEMP_EMP":
        return String(temporaryEmployees);
      case "INTERN_EMP":
        return String(internEmployees);
      case "MALE_EMP":
        return String(maleEmployees);
      case "FEMALE_EMP":
        return String(femaleEmployees);
      case "OTHER_GENDER_EMP":
        return String(otherGenderEmployees);
      case "AGE_LT30":
        return String(ageLt30);
      case "AGE_30_50":
        return String(age30to50);
      case "AGE_GT50":
        return String(ageGt50);

      case "TRAINED_EMP":
        return String(trainedEmployees);
      case "TRAINING_REC_CNT":
        return String(trainingRecordCount);
      case "TRAIN_TOTAL":
        return String(trainingTotal);
      case "TRAIN_VALID":
        return String(trainingValid);
      case "TRAIN_EXPIRED":
        return String(trainingExpired);
      case "TRAIN_PLANNED":
        return String(trainingPlanned);
      case "TRAIN_COMPLETED":
        return String(trainingCompleted);
      case "TRAIN_HOURS":
        return String(trainingHours);

      case "HSE_TOTAL":
        return String(hseTotal);
      case "HSE_INCIDENT":
        return String(hseIncident);
      case "HSE_NEAR_MISS":
        return String(hseNearMiss);
      case "HSE_INJURY":
        return String(hseInjury);
      case "HSE_LTI":
        return String(hseLti);
      case "HSE_MEDICAL":
        return String(hseMedical);
      case "HSE_FIRST_AID":
        return String(hseFirstAid);
      case "HSE_LOST_DAYS":
        return String(hseLostDays);

      default:
        return "";
    }
  }

  const sectionsMap = new Map<
    string,
    Array<{
      code: string;
      label: string;
      unit: string | null;
      value: string;
    }>
  >();

  for (const field of templateFields) {
    const key = field.sectionCode || "GENERAL";
    const row = {
      code: field.code,
      label: field.label,
      unit: field.unit ?? null,
      value: resolveFieldValue(field),
    };

    if (!sectionsMap.has(key)) sectionsMap.set(key, []);
    sectionsMap.get(key)!.push(row);
  }

  const sections = Array.from(sectionsMap.entries()).map(([sectionCode, rows]) => ({
    sectionCode,
    rows,
  }));

  return {
    summary: {
      totalEmployees,
      permanentEmployees,
      contractorEmployees,
      temporaryEmployees,
      internEmployees,
      maleEmployees,
      femaleEmployees,
      otherGenderEmployees,
      ageLt30,
      age30to50,
      ageGt50,
      trainedEmployees,
      trainingRecordCount,
      trainingTotal,
      trainingValid,
      trainingExpired,
      trainingPlanned,
      trainingCompleted,
      trainingHours,
      hseTotal,
      hseIncident,
      hseNearMiss,
      hseInjury,
      hseLti,
      hseMedical,
      hseFirstAid,
      hseLostDays,
    },
    sections,
  };
}