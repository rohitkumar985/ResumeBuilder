import React, { useEffect, useRef, useState } from "react";
import { LuMail, LuPhone, LuGithub, LuGlobe } from "react-icons/lu";
import { RiLinkedinLine } from "react-icons/ri";
import {
  EducationInfo,
  WorkExperience,
  ProjectInfo,
} from "./ResumeSection";
import { formatYearMonth } from "../utils/helper";

const DEFAULT_THEME = ["#ffffff", "#0d47a1", "#1e88e5", "#64b5f6", "#bbdefb"];

const Title = ({ text }) => (
  <div className="relative w-fit mb-1 resume-section-title">
    <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">
      {text}
    </h2>
  </div>
);

const TemplateOne = ({ resumeData = {}, containerWidth }) => {
  const {
    profileInfo = {},
    contactInfo = {},
    education = [],
    languages = [],
    workExperience = [],
    projects = [],
    skills = [],
    certifications = [],
    interests = [],
  } = resumeData;

  const resumeRef = useRef(null);
  const [baseWidth, setBaseWidth] = useState(800);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (resumeRef.current && containerWidth > 0) {
      const actualWidth = resumeRef.current.offsetWidth;
      setBaseWidth(actualWidth);
      setScale(containerWidth / actualWidth);
    }
  }, [containerWidth]);

  return (
    <div
      ref={resumeRef}
      className="p-5 bg-white font-sans text-gray-800 text-xs"
      style={{
        transform: containerWidth > 0 ? `scale(${scale})` : undefined,
        transformOrigin: "top left",
        width: containerWidth > 0 ? `${baseWidth}px` : undefined,
      }}
    >
      {/* Header */}
      <div className="resume-section flex justify-between items-start mb-4">
        <div>
          <h1 className="text-2xl font-bold pb-1 text-gray-900">
            {profileInfo.fullName}
          </h1>
          <p className="text-sm font-medium pb-1">{profileInfo.designation}</p>
          <div className="flex flex-wrap gap-3 text-xs text-gray-600">
            {contactInfo.email && (
              <div className="flex items-center">
                <LuMail className="mr-1" />
                <a href={`mailto:${contactInfo.email}`} className="hover:underline">
                  {contactInfo.email}
                </a>
              </div>
            )}
            {contactInfo.phone && (
              <div className="flex items-center">
                <LuPhone className="mr-1" />
                <a href={`tel:${contactInfo.phone}`} className="hover:underline">
                  {contactInfo.phone}
                </a>
              </div>
            )}
            {contactInfo.location && (
              <div className="flex items-center">
                <span>{contactInfo.location}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end text-xs text-gray-600 space-y-1">
          {contactInfo.linkedin && (
            <div className="flex items-center">
              <RiLinkedinLine className="mr-1" />
              <a href={contactInfo.linkedin} target="_blank" rel="noopener noreferrer" className="hover:underline">
                LinkedIn
              </a>
            </div>
          )}
          {contactInfo.github && (
            <div className="flex items-center">
              <LuGithub className="mr-1" />
              <a href={contactInfo.github} target="_blank" rel="noopener noreferrer" className="hover:underline">
                GitHub
              </a>
            </div>
          )}
          {contactInfo.website && (
            <div className="flex items-center">
              <LuGlobe className="mr-1" />
              <a href={contactInfo.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                Portfolio
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Professional Summary */}
      {profileInfo.summary && (
        <div className="resume-section mb-3">
          <Title text="Professional Summary" />
          <p className="text-xs leading-releaxed">{profileInfo.summary}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="col-span-2 space-y-3">
          {workExperience.length > 0 && (
            <div className="resume-section">
              <Title text="Work Experience" />
              <div className="space-y-3">
                {workExperience.map((exp, i) => (
                  <WorkExperience
                    key={i}
                    company={exp.company}
                    role={exp.role}
                    duration={`${formatYearMonth(exp.startDate)} - ${formatYearMonth(exp.endDate)}`}
                    description={exp.description}
                  />
                ))}
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div className="resume-section">
              <Title text="Projects" />
              <div className="space-y-2">
                {projects.map((proj, i) => (
                  <ProjectInfo
                    key={i}
                    title={proj.title}
                    description={proj.description}
                    githubLink={proj.github}
                    liveDemoUrl={proj.liveDemo}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {languages.length > 0 && (
            <div className="resume-section">
              <Title text="Languages" />
              <div className="flex flex-wrap gap-1">
                {languages.map((lang, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700"
                  >
                    {lang.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="col-span-1 space-y-3">
          {skills.length > 0 && (
            <div className="resume-section">
              <Title text="Skills" />
              <div className="flex flex-wrap gap-1">
                {skills.map((skill, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {education.length > 0 && (
            <div className="resume-section">
              <Title text="Education" />
              <div className="space-y-2">
                {education.map((edu, i) => (
                  <EducationInfo
                    key={i}
                    degree={edu.degree}
                    institution={edu.institution}
                    duration={`${formatYearMonth(edu.startDate)} - ${formatYearMonth(edu.endDate)}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Certifications - Issuer and Year on Next Line Right Aligned */}
          {certifications.length > 0 && (
            <div className="resume-section">
              <Title text="Certifications" />
              <ul className="list-disc list-inside space-y-2">
                {certifications.map((cert, i) => (
                  <li key={i} className="text-[11px] leading-tight text-gray-800">
                    <span className="font-normal">{cert.title}</span>
                    {(cert.issuer || cert.year) && (
                      <div className="flex justify-end text-gray-500 text-[10px] font-normal">
                        {cert.issuer ? cert.issuer : ""}
                        {cert.issuer && cert.year ? `, ${cert.year}` : cert.year ? cert.year : ""}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {interests.length > 0 && interests.some((i) => i) && (
            <div className="resume-section">
              <Title text="Interests" />
              <div className="flex flex-wrap gap-1">
                {interests.map((int, i) =>
                  int ? (
                    <span
                      key={i}
                      className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700"
                    >
                      {int}
                    </span>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateOne;