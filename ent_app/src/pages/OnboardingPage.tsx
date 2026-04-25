import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { UserGender, UserProfession } from "../types";
import { useLanguage } from "../i18n";
import { useWander } from "../wander-state";

const genderValues: UserGender[] = ["male", "female", "private"];
const professionValues: UserProfession[] = [
  "student",
  "teacher",
  "engineer",
  "designer",
  "product",
  "marketing",
  "finance",
  "healthcare",
  "service",
  "freelancer",
  "other",
];

export function OnboardingPage() {
  const { language } = useLanguage();
  const { userProfile, updateUserProfile } = useWander();
  const navigate = useNavigate();
  const labels = buildOnboardingLabels(language);
  const [name, setName] = useState(userProfile.name === "Wander User" ? "" : userProfile.name);
  const [gender, setGender] = useState<UserGender>(userProfile.gender);
  const [profession, setProfession] = useState<UserProfession>(userProfile.profession);
  const [avatarDataUrl, setAvatarDataUrl] = useState(userProfile.avatarDataUrl);
  const [error, setError] = useState("");

  const handleAvatarUpload = (file: File | null) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    const safeName = name.trim();

    if (!safeName) {
      setError(labels.nameRequired);
      return;
    }

    updateUserProfile({
      name: safeName,
      gender,
      profession,
      avatarDataUrl,
      hasCompletedOnboarding: true,
    });
    navigate("/", { replace: true });
  };

  return (
    <main className="onboarding-page">
      <section className="onboarding-panel">
        <div className="onboarding-copy">
          <span className="eyebrow">Wander</span>
          <h1>{labels.title}</h1>
        </div>

        <div className="onboarding-card">
          <div className="profile-avatar-editor onboarding-avatar">
            <div className="profile-large-avatar">
              {avatarDataUrl ? <img src={avatarDataUrl} alt="" /> : (name || "W").slice(0, 1).toUpperCase()}
            </div>
            <label className="avatar-upload-button">
              {labels.uploadAvatar}
              <input
                accept="image/*"
                type="file"
                onChange={(event) => handleAvatarUpload(event.target.files?.[0] ?? null)}
              />
            </label>
            {avatarDataUrl ? (
              <button className="plain-action" type="button" onClick={() => setAvatarDataUrl(null)}>
                {labels.defaultAvatar}
              </button>
            ) : null}
          </div>

          <div className="profile-form-grid onboarding-form-grid">
            <label className="profile-field">
              <span>{labels.nickname}</span>
              <input
                value={name}
                autoComplete="nickname"
                placeholder={labels.nicknamePlaceholder}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="profile-field">
              <span>{labels.email}</span>
              <input value={userProfile.email} disabled />
            </label>
            <div className="profile-field">
              <span>{labels.gender}</span>
              <div className="segmented-group profile-segmented">
                {genderValues.map((item) => (
                  <button
                    className={`segment ${gender === item ? "is-active" : ""}`}
                    key={item}
                    type="button"
                    onClick={() => setGender(item)}
                  >
                    {labels.genderOptions[item]}
                  </button>
                ))}
              </div>
            </div>
            <label className="profile-field">
              <span>{labels.profession}</span>
              <select
                value={profession}
                onChange={(event) => setProfession(event.target.value as UserProfession)}
              >
                {professionValues.map((item) => (
                  <option key={item} value={item}>
                    {labels.professionOptions[item]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error ? <p className="auth-error">{error}</p> : null}

          <button className="primary-button onboarding-submit" type="button" onClick={handleSubmit}>
            {labels.finish}
          </button>
        </div>
      </section>
    </main>
  );
}

function buildOnboardingLabels(language: "zh" | "en") {
  return language === "zh"
    ? {
        title: "完善你的 Wander 资料",
        subtitle: "这些信息会显示在个人中心，并用于之后的路线偏好和社区分享。",
        nickname: "昵称",
        nicknamePlaceholder: "例如 Roxy",
        email: "账号",
        gender: "性别",
        profession: "职业",
        uploadAvatar: "上传头像",
        defaultAvatar: "使用默认头像",
        finish: "完成并进入 Wander",
        nameRequired: "请先设置一个昵称。",
        genderOptions: {
          male: "男",
          female: "女",
          private: "不愿透露",
        },
        professionOptions: {
          student: "学生",
          teacher: "教师",
          engineer: "工程师",
          designer: "设计师",
          product: "产品经理",
          marketing: "市场 / 运营",
          finance: "金融 / 财务",
          healthcare: "医疗健康",
          service: "服务业",
          freelancer: "自由职业",
          other: "其他",
        },
      }
    : {
        title: "Set up your Wander profile",
        subtitle: "These details will appear in Profile and later help with route preferences and community posts.",
        nickname: "Nickname",
        nicknamePlaceholder: "For example, Roxy",
        email: "Account",
        gender: "Gender",
        profession: "Profession",
        uploadAvatar: "Upload Avatar",
        defaultAvatar: "Use Default Avatar",
        finish: "Finish and Enter Wander",
        nameRequired: "Please set a nickname first.",
        genderOptions: {
          male: "Male",
          female: "Female",
          private: "Prefer not to say",
        },
        professionOptions: {
          student: "Student",
          teacher: "Teacher",
          engineer: "Engineer",
          designer: "Designer",
          product: "Product Manager",
          marketing: "Marketing / Operations",
          finance: "Finance",
          healthcare: "Healthcare",
          service: "Service",
          freelancer: "Freelancer",
          other: "Other",
        },
      };
}
