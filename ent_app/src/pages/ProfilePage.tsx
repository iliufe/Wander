import type { SavedAddress, UserGender, UserProfession } from "../types";
import { useCopy, useLanguage } from "../i18n";
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

export function ProfilePage() {
  const copy = useCopy();
  const { language, setLanguage } = useLanguage();
  const {
    location,
    locationReady,
    userProfile,
    updateUserProfile,
    logout,
    savedAddresses,
    updateSavedAddress,
    setSavedAddressFromCurrentLocation,
    clearSavedAddress,
  } = useWander();
  const labels = buildProfileLabels(language);

  const handleAvatarUpload = (file: File | null) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateUserProfile({ avatarDataUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className="profile-settings-page">
      <section className="profile-toolbar">
        <div>
          <span className="eyebrow">{copy.profile.eyebrow}</span>
          <h1>{labels.title}</h1>
        </div>
        <div className="language-switch profile-language-switch">
          <button
            className={`lang-button ${language === "zh" ? "is-active" : ""}`}
            type="button"
            onClick={() => setLanguage("zh")}
          >
            中文
          </button>
          <button
            className={`lang-button ${language === "en" ? "is-active" : ""}`}
            type="button"
            onClick={() => setLanguage("en")}
          >
            English
          </button>
        </div>
      </section>

      <section className="profile-account-panel">
        <div className="profile-avatar-editor">
          <div className="profile-large-avatar">
            {userProfile.avatarDataUrl ? (
              <img src={userProfile.avatarDataUrl} alt="" />
            ) : (
              userProfile.name.slice(0, 1).toUpperCase()
            )}
          </div>
          <label className="avatar-upload-button">
            {labels.uploadAvatar}
            <input
              accept="image/*"
              type="file"
              onChange={(event) => handleAvatarUpload(event.target.files?.[0] ?? null)}
            />
          </label>
          {userProfile.avatarDataUrl ? (
            <button className="plain-action" type="button" onClick={() => updateUserProfile({ avatarDataUrl: null })}>
              {labels.defaultAvatar}
            </button>
          ) : null}
        </div>

        <div className="profile-form-grid">
          <label className="profile-field">
            <span>{labels.name}</span>
            <input
              value={userProfile.name}
              onChange={(event) => updateUserProfile({ name: event.target.value })}
            />
          </label>
          <label className="profile-field">
            <span>{labels.email}</span>
            <input
              value={userProfile.email}
              onChange={(event) => updateUserProfile({ email: event.target.value })}
            />
          </label>
          <div className="profile-field">
            <span>{labels.gender}</span>
            <div className="segmented-group profile-segmented">
              {genderValues.map((item) => (
                <button
                  className={`segment ${userProfile.gender === item ? "is-active" : ""}`}
                  key={item}
                  type="button"
                  onClick={() => updateUserProfile({ gender: item })}
                >
                  {labels.genderOptions[item]}
                </button>
              ))}
            </div>
          </div>
          <label className="profile-field">
            <span>{labels.profession}</span>
            <select
              value={userProfile.profession}
              onChange={(event) => updateUserProfile({ profession: event.target.value as UserProfession })}
            >
              {professionValues.map((item) => (
                <option key={item} value={item}>
                  {labels.professionOptions[item]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button className="plain-action profile-logout" type="button" onClick={logout}>
          {labels.logout}
        </button>
      </section>

      <section className="saved-address-grid">
        {savedAddresses.map((item) => (
          <AddressCard
            key={item.id}
            address={item}
            disabled={!locationReady}
            currentAddress={location.formattedAddress || location.label}
            labels={labels}
            onAddressChange={(address) => updateSavedAddress(item.id, { address })}
            onUseCurrent={() => setSavedAddressFromCurrentLocation(item.id)}
            onClear={() => clearSavedAddress(item.id)}
          />
        ))}
      </section>
    </main>
  );
}

interface AddressCardProps {
  address: SavedAddress;
  disabled: boolean;
  currentAddress: string;
  labels: ReturnType<typeof buildProfileLabels>;
  onAddressChange: (address: string) => void;
  onUseCurrent: () => void;
  onClear: () => void;
}

function AddressCard({
  address,
  disabled,
  currentAddress,
  labels,
  onAddressChange,
  onUseCurrent,
  onClear,
}: AddressCardProps) {
  return (
    <article className="saved-address-card">
      <div className="saved-address-head">
        <span>{address.label}</span>
        <strong>{address.address || labels.empty}</strong>
      </div>
      <input
        value={address.address}
        onChange={(event) => onAddressChange(event.target.value)}
        placeholder={labels.placeholder(address.label)}
      />
      <div className="saved-address-actions">
        <button type="button" onClick={onUseCurrent} disabled={disabled}>
          {labels.useCurrent}
        </button>
        <button type="button" onClick={() => onAddressChange(currentAddress)} disabled={disabled}>
          {labels.fillCurrent}
        </button>
        <button type="button" onClick={onClear}>
          {labels.clear}
        </button>
      </div>
    </article>
  );
}

function buildProfileLabels(language: "zh" | "en") {
  return language === "zh"
    ? {
        title: "个人资料",
        name: "名字",
        email: "邮箱",
        gender: "性别",
        profession: "职业",
        uploadAvatar: "上传头像",
        defaultAvatar: "使用默认头像",
        logout: "退出登录",
        empty: "未设置",
        useCurrent: "保存当前定位",
        fillCurrent: "填入当前位置",
        clear: "清空",
        placeholder: (label: string) => `输入${label}地址`,
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
          marketing: "市场/运营",
          finance: "金融/财务",
          healthcare: "医疗健康",
          service: "服务业",
          freelancer: "自由职业",
          other: "其他",
        },
      }
    : {
        title: "Profile",
        name: "Name",
        email: "Email",
        gender: "Gender",
        profession: "Profession",
        uploadAvatar: "Upload Avatar",
        defaultAvatar: "Use Default Avatar",
        logout: "Log Out",
        empty: "Not set",
        useCurrent: "Save GPS",
        fillCurrent: "Fill Current",
        clear: "Clear",
        placeholder: (label: string) => `Enter ${label} address`,
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
