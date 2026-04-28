import { useEffect, useState } from "react";
import type { SavedAddress, UserGender, UserProfession } from "../types";
import { useCopy, useLanguage } from "../i18n";
import { searchStartPlacesWithApi, type StartPlaceSearchResult } from "../services/plans-api";
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
    userProfile,
    updateUserProfile,
    logout,
    savedAddresses,
    updateSavedAddress,
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
            locationContext={{
              latitude: location.latitude,
              longitude: location.longitude,
              city: location.cityName || location.districtName,
              adcode: location.adcode,
            }}
            labels={labels}
            onSave={(place) =>
              updateSavedAddress(item.id, {
                label: item.label,
                address: place.address || place.name,
                latitude: place.latitude,
                longitude: place.longitude,
              })
            }
          />
        ))}
      </section>
    </main>
  );
}

interface AddressCardProps {
  address: SavedAddress;
  locationContext: {
    latitude: number | null;
    longitude: number | null;
    city?: string | null;
    adcode?: string | null;
  };
  labels: ReturnType<typeof buildProfileLabels>;
  onSave: (place: StartPlaceSearchResult) => void;
}

function AddressCard({ address, locationContext, labels, onSave }: AddressCardProps) {
  const [query, setQuery] = useState(address.address);
  const [selectedPlace, setSelectedPlace] = useState<StartPlaceSearchResult | null>(null);
  const [results, setResults] = useState<StartPlaceSearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "empty">("idle");

  useEffect(() => {
    setQuery(address.address);
    setSelectedPlace(null);
  }, [address.address]);

  useEffect(() => {
    const keyword = query.trim();
    if (selectedPlace || keyword.length < 2) {
      setResults([]);
      setStatus("idle");
      return undefined;
    }

    const controller = new AbortController();
    setStatus("loading");
    const timer = window.setTimeout(() => {
      searchStartPlacesWithApi(
        {
          query: keyword,
          latitude: locationContext.latitude,
          longitude: locationContext.longitude,
          city: locationContext.city,
          adcode: locationContext.adcode,
        },
        controller.signal
      )
        .then((places) => {
          if (controller.signal.aborted) {
            return;
          }
          setResults(places);
          setStatus(places.length ? "idle" : "empty");
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setResults([]);
            setStatus("empty");
          }
        });
    }, 320);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    locationContext.adcode,
    locationContext.city,
    locationContext.latitude,
    locationContext.longitude,
    query,
    selectedPlace,
  ]);

  return (
    <article className="saved-address-card">
      <div className="saved-address-head">
        <span>{address.label}</span>
        <strong>{address.address || labels.empty}</strong>
      </div>
      <div className="ride-search-box saved-address-search">
        <span className="ride-search-icon"></span>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedPlace(null);
          }}
          placeholder={labels.placeholder(address.label)}
        />
      </div>
      {status === "loading" ? <div className="start-search-state">{labels.searching}</div> : null}
      {status === "empty" && query.trim().length >= 2 ? (
        <div className="start-search-state">{labels.noResults}</div>
      ) : null}
      {results.length ? (
        <div className="start-result-list saved-address-results">
          {results.map((place, index) => (
            <button
              className="start-result-item"
              key={place.id}
              type="button"
              onClick={() => {
                setSelectedPlace(place);
                setQuery(place.name);
                setResults([]);
                setStatus("idle");
              }}
            >
              <span className="start-result-pin">{index + 1}</span>
              <span className="start-result-copy">
                <strong>{place.name}</strong>
                <small>{place.address || place.area}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="saved-address-actions">
        <button type="button" onClick={() => selectedPlace && onSave(selectedPlace)} disabled={!selectedPlace}>
          {labels.save}
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedPlace(null);
            setQuery("");
            setResults([]);
            setStatus("idle");
          }}
        >
          {labels.modify}
        </button>
      </div>
    </article>
  );
}

function buildProfileLabels(language: "zh" | "en") {
  return language === "zh"
    ? {
        title: "个人中心",
        name: "昵称",
        email: "邮箱",
        gender: "性别",
        profession: "职业",
        uploadAvatar: "上传头像",
        defaultAvatar: "使用默认头像",
        logout: "退出登录",
        empty: "未设置",
        save: "保存",
        modify: "修改",
        searching: "正在搜索地址...",
        noResults: "没有找到匹配地址，请换个关键词。",
        placeholder: (label: string) => `输入${label}地址关键词`,
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
          finance: "金融",
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
        save: "Save",
        modify: "Modify",
        searching: "Searching addresses...",
        noResults: "No matching address yet. Try another keyword.",
        placeholder: (label: string) => `Enter ${label} address keyword`,
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
