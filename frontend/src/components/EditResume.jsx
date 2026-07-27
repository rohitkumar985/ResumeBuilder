import { useEffect, useRef, useState, useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, AlertCircle, Download, Palette, Save, Trash2, Check, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import DashboardLayout from "../components/DashboardLayout"
import { TitleInput } from "../components/Inputs"
import axiosInstance from "../utils/axiosInstance"
import { API_PATHS } from "../utils/apiPaths"
import StepProgress from "../components/StepProgress"

import './A4.css'

import {
  AdditionalInfoForm,
  CertificationInfoForm,
  ContactInfoForm,
  EducationDetailsForm,
  ProfileInfoForm,
  ProjectDetailForm,
  SkillsInfoForm,
  WorkExperienceForm,
} from "../components/Forms"
import RenderResume from "../components/RenderResume"
import { dataURLtoFile } from "../utils/helper"
import ThemeSelector from "../components/ThemeSelector"
import Modal from "../components/Modal"
import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"
import { fixTailwindColors } from "../utils/colors"
import {
  containerStyles,
  buttonStyles,
  statusStyles,
  iconStyles
} from "../assets/dummystyle"

// Resize observer hook
const useResizeObserver = () => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const ref = useCallback((node) => {
    if (node) {
      const resizeObserver = new ResizeObserver((entries) => {
        const { width, height } = entries[0].contentRect;
        setSize({ width, height });
      });

      resizeObserver.observe(node);
    }
  }, []);

  return { ...size, ref };
};

const PDF_WIDTH_MM = 210;
const PDF_HEIGHT_MM = 297;

const isMostlyWhiteRow = (ctx, width, y, whiteThreshold = 245) => {
  const data = ctx.getImageData(0, y, width, 1).data;
  let coloredPixels = 0;

  for (let x = 0; x < width; x += 4) {
    const offset = x * 4;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const alpha = data[offset + 3];

    if (alpha > 10 && (red < whiteThreshold || green < whiteThreshold || blue < whiteThreshold)) {
      coloredPixels++;
    }
  }

  return coloredPixels / Math.ceil(width / 4) < 0.01;
};

const findLastContentRow = (ctx, canvas) => {
  for (let y = canvas.height - 1; y >= 0; y -= 2) {
    if (!isMostlyWhiteRow(ctx, canvas.width, y, 250)) {
      return Math.min(canvas.height, y + 16);
    }
  }

  return canvas.height;
};

const findSafePageEnd = (ctx, canvas, startY, maxEndY) => {
  if (maxEndY >= canvas.height) return canvas.height;

  const sliceHeight = maxEndY - startY;
  const searchTop = Math.max(startY + Math.floor(sliceHeight * 0.55), maxEndY - 280);
  const searchBottom = Math.max(startY + 40, maxEndY - 20);
  let blankRun = 0;

  for (let y = searchBottom; y >= searchTop; y--) {
    if (isMostlyWhiteRow(ctx, canvas.width, y)) {
      blankRun++;
      if (blankRun >= 10) {
        return Math.min(maxEndY, y + blankRun);
      }
    } else {
      blankRun = 0;
    }
  }

  return maxEndY;
};

const isBlankSlice = (ctx, canvas, startY, endY) => {
  for (let y = startY; y < endY; y += 12) {
    if (!isMostlyWhiteRow(ctx, canvas.width, y, 250)) {
      return false;
    }
  }

  return true;
};

const EditResume = () => {
  const { resumeId } = useParams()
  const navigate = useNavigate()
  const resumeDownloadRef = useRef(null)
  const thumbnailRef = useRef(null)

  const [openThemeSelector, setOpenThemeSelector] = useState(false)
  const [openPreviewModal, setOpenPreviewModal] = useState(false)
  const [currentPage, setCurrentPage] = useState("profile-info")
  const [progress, setProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [completionPercentage, setCompletionPercentage] = useState(0)

  const { width: previewWidth, ref: previewContainerRef } = useResizeObserver();

  const [resumeData, setResumeData] = useState({
    title: "Professional Resume",
    thumbnailLink: "",
    profileInfo: {
      fullName: "",
      designation: "",
      summary: "",
    },
    template: {
      theme: "modern",
      colorPalette: []
    },
    contactInfo: {
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      github: "",
      website: "",
    },
    workExperience: [
      {
        company: "",
        role: "",
        startDate: "",
        endDate: "",
        description: "",
      },
    ],
    education: [
      {
        degree: "",
        institution: "",
        startDate: "",
        endDate: "",
      },
    ],
    skills: [
      {
        name: "",
        progress: 0,
      },
    ],
    projects: [
      {
        title: "",
        description: "",
        github: "",
        liveDemo: "",
      },
    ],
    certifications: [
      {
        title: "",
        issuer: "",
        year: "",
      },
    ],
    languages: [
      {
        name: "",
        progress: 0,
      },
    ],
    interests: [""],
  })

  // Calculate completion percentage
  const calculateCompletion = () => {
    let completedFields = 0;
    let totalFields = 0;

    // Profile Info
    totalFields += 3;
    if (resumeData.profileInfo.fullName) completedFields++;
    if (resumeData.profileInfo.designation) completedFields++;
    if (resumeData.profileInfo.summary) completedFields++;

    // Contact Info
    totalFields += 2;
    if (resumeData.contactInfo.email) completedFields++;
    if (resumeData.contactInfo.phone) completedFields++;

    // Work Experience
    resumeData.workExperience.forEach(exp => {
      totalFields += 5;
      if (exp.company) completedFields++;
      if (exp.role) completedFields++;
      if (exp.startDate) completedFields++;
      if (exp.endDate) completedFields++;
      if (exp.description) completedFields++;
    });

    // Education
    resumeData.education.forEach(edu => {
      totalFields += 4;
      if (edu.degree) completedFields++;
      if (edu.institution) completedFields++;
      if (edu.startDate) completedFields++;
      if (edu.endDate) completedFields++;
    });

    // Skills
    resumeData.skills.forEach(skill => {
      totalFields += 2;
      if (skill.name) completedFields++;
      if (skill.progress > 0) completedFields++;
    });

    // Projects
    resumeData.projects.forEach(project => {
      totalFields += 4;
      if (project.title) completedFields++;
      if (project.description) completedFields++;
      if (project.github) completedFields++;
      if (project.liveDemo) completedFields++;
    });

    // Certifications
    resumeData.certifications.forEach(cert => {
      totalFields += 3;
      if (cert.title) completedFields++;
      if (cert.issuer) completedFields++;
      if (cert.year) completedFields++;
    });

    // Languages
    resumeData.languages.forEach(lang => {
      totalFields += 2;
      if (lang.name) completedFields++;
      if (lang.progress > 0) completedFields++;
    });

    // Interests
    totalFields += resumeData.interests.length;
    completedFields += resumeData.interests.filter(i => i.trim() !== "").length;

    const percentage = Math.round((completedFields / totalFields) * 100);
    setCompletionPercentage(percentage);
    return percentage;
  };

  useEffect(() => {
    calculateCompletion();
  }, [resumeData]);

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Validate Inputs
  const validateAndNext = () => {
    const errors = []

    switch (currentPage) {
      case "profile-info": {
        const { fullName, designation, summary } = resumeData.profileInfo
        if (!fullName.trim()) errors.push("Full Name is required")
        if (!designation.trim()) errors.push("Designation is required")
        if (!summary.trim()) errors.push("Summary is required")
        break
      }

      case "contact-info": {
        const { email, phone } = resumeData.contactInfo
        if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) errors.push("Valid email is required.")
        if (!phone.trim() || !/^\d{10}$/.test(phone)) errors.push("Valid 10-digit phone number is required")
        break
      }

      case "work-experience":
        resumeData.workExperience.forEach(({ company, role, startDate, endDate }, index) => {
          if (!company || !company.trim()) errors.push(`Company is required in experience ${index + 1}`)
          if (!role || !role.trim()) errors.push(`Role is required in experience ${index + 1}`)
          if (!startDate || !endDate) errors.push(`Start and End dates are required in experience ${index + 1}`)
        })
        break

      case "education-info":
        resumeData.education.forEach(({ degree, institution, startDate, endDate }, index) => {
          if (!degree.trim()) errors.push(`Degree is required in education ${index + 1}`)
          if (!institution.trim()) errors.push(`Institution is required in education ${index + 1}`)
          if (!startDate || !endDate) errors.push(`Start and End dates are required in education ${index + 1}`)
        })
        break

      case "skills":
        resumeData.skills.forEach(({ name, progress }, index) => {
          if (!name.trim()) errors.push(`Skill name is required in skill ${index + 1}`)
          if (progress < 1 || progress > 100)
            errors.push(`Skill progress must be between 1 and 100 in skill ${index + 1}`)
        })
        break

      case "projects":
        resumeData.projects.forEach(({ title, description }, index) => {
          if (!title.trim()) errors.push(`Project Title is required in project ${index + 1}`)
          if (!description.trim()) errors.push(`Project description is required in project ${index + 1}`)
        })
        break

      case "certifications":
        resumeData.certifications.forEach(({ title, issuer }, index) => {
          if (!title.trim()) errors.push(`Certification Title is required in certification ${index + 1}`)
          if (!issuer.trim()) errors.push(`Issuer is required in certification ${index + 1}`)
        })
        break

      case "additionalInfo":
        if (resumeData.languages.length === 0 || !resumeData.languages[0].name?.trim()) {
          errors.push("At least one language is required")
        }
        if (resumeData.interests.length === 0 || !resumeData.interests[0]?.trim()) {
          errors.push("At least one interest is required")
        }
        break

      default:
        break
    }

    if (errors.length > 0) {
      setErrorMsg(errors.join(", "))
      return
    }

    setErrorMsg("")
    goToNextStep()
  }

  const goToNextStep = () => {
    const pages = [
      "profile-info",
      "contact-info",
      "work-experience",
      "education-info",
      "skills",
      "projects",
      "certifications",
      "additionalInfo",
    ]

    if (currentPage === "additionalInfo") setOpenPreviewModal(true)

    const currentIndex = pages.indexOf(currentPage)
    if (currentIndex !== -1 && currentIndex < pages.length - 1) {
      const nextIndex = currentIndex + 1
      setCurrentPage(pages[nextIndex])

      const percent = Math.round((nextIndex / (pages.length - 1)) * 100)
      setProgress(percent)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const goBack = () => {
    const pages = [
      "profile-info",
      "contact-info",
      "work-experience",
      "education-info",
      "skills",
      "projects",
      "certifications",
      "additionalInfo",
    ]

    if (currentPage === "profile-info") navigate("/dashboard")

    const currentIndex = pages.indexOf(currentPage)
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1
      setCurrentPage(pages[prevIndex])

      const percent = Math.round((prevIndex / (pages.length - 1)) * 100)
      setProgress(percent)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const renderForm = () => {
    switch (currentPage) {
      case "profile-info":
        return (
          <ProfileInfoForm
            profileData={resumeData?.profileInfo}
            updateSection={(key, value) => updateSection("profileInfo", key, value)}
            onNext={validateAndNext}
          />
        )

      case "contact-info":
        return (
          <ContactInfoForm
            contactInfo={resumeData?.contactInfo}
            updateSection={(key, value) => updateSection("contactInfo", key, value)}
          />
        )

      case "work-experience":
        return (
          <WorkExperienceForm
            workExperience={resumeData?.workExperience}
            updateArrayItem={(index, key, value) => {
              updateArrayItem("workExperience", index, key, value)
            }}
            addArrayItem={(newItem) => addArrayItem("workExperience", newItem)}
            removeArrayItem={(index) => removeArrayItem("workExperience", index)}
          />
        )

      case "education-info":
        return (
          <EducationDetailsForm
            educationInfo={resumeData?.education}
            updateArrayItem={(index, key, value) => {
              updateArrayItem("education", index, key, value)
            }}
            addArrayItem={(newItem) => addArrayItem("education", newItem)}
            removeArrayItem={(index) => removeArrayItem("education", index)}
          />
        )

      case "skills":
        return (
          <SkillsInfoForm
            skillsInfo={resumeData?.skills}
            updateArrayItem={(index, key, value) => {
              updateArrayItem("skills", index, key, value)
            }}
            addArrayItem={(newItem) => addArrayItem("skills", newItem)}
            removeArrayItem={(index) => removeArrayItem("skills", index)}
          />
        )

      case "projects":
        return (
          <ProjectDetailForm
            projectInfo={resumeData?.projects}
            updateArrayItem={(index, key, value) => {
              updateArrayItem("projects", index, key, value)
            }}
            addArrayItem={(newItem) => addArrayItem("projects", newItem)}
            removeArrayItem={(index) => removeArrayItem("projects", index)}
          />
        )

      case "certifications":
        return (
          <CertificationInfoForm
            certifications={resumeData?.certifications}
            updateArrayItem={(index, key, value) => {
              updateArrayItem("certifications", index, key, value)
            }}
            addArrayItem={(newItem) => addArrayItem("certifications", newItem)}
            removeArrayItem={(index) => removeArrayItem("certifications", index)}
          />
        )

      case "additionalInfo":
        return (
          <AdditionalInfoForm
            languages={resumeData.languages}
            interests={resumeData.interests}
            updateArrayItem={(section, index, key, value) => updateArrayItem(section, index, key, value)}
            addArrayItem={(section, newItem) => addArrayItem(section, newItem)}
            removeArrayItem={(section, index) => removeArrayItem(section, index)}
          />
        )

      default:
        return null
    }
  }

  const updateSection = (section, key, value) => {
    setResumeData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }))
  }

  const updateArrayItem = (section, index, key, value) => {
    setResumeData((prev) => {
      const updatedArray = [...prev[section]]

      if (key === null) {
        updatedArray[index] = value
      } else {
        updatedArray[index] = {
          ...updatedArray[index],
          [key]: value,
        }
      }

      return {
        ...prev,
        [section]: updatedArray,
      }
    })
  }

  const addArrayItem = (section, newItem) => {
    setResumeData((prev) => ({
      ...prev,
      [section]: [...prev[section], newItem],
    }))
  }

  const removeArrayItem = (section, index) => {
    setResumeData((prev) => {
      const updatedArray = [...prev[section]]
      updatedArray.splice(index, 1)
      return {
        ...prev,
        [section]: updatedArray,
      }
    })
  }

  const fetchResumeDetailsById = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.RESUME.GET_BY_ID(resumeId))

      if (response.data && response.data.profileInfo) {
        const resumeInfo = response.data

        setResumeData((prevState) => ({
          ...prevState,
          title: resumeInfo?.title || "Untitled",
          template: resumeInfo?.template || prevState?.template,
          profileInfo: resumeInfo?.profileInfo || prevState?.profileInfo,
          contactInfo: resumeInfo?.contactInfo || prevState?.contactInfo,
          workExperience: resumeInfo?.workExperience || prevState?.workExperience,
          education: resumeInfo?.education || prevState?.education,
          skills: resumeInfo?.skills || prevState?.skills,
          projects: resumeInfo?.projects || prevState?.projects,
          certifications: resumeInfo?.certifications || prevState?.certifications,
          languages: resumeInfo?.languages || prevState?.languages,
          interests: resumeInfo?.interests || prevState?.interests,
        }))
      }
    } catch (error) {
      console.error("Error fetching resume:", error)
      toast.error("Failed to load resume data")
    }
  }

  const uploadResumeImages = async () => {
    try {
      setIsLoading(true)

      const thumbnailElement = thumbnailRef.current
      if (!thumbnailElement) {
        throw new Error("Thumbnail element not found")
      }

      const fixedThumbnail = fixTailwindColors(thumbnailElement)

      const thumbnailCanvas = await html2canvas(fixedThumbnail, {
        scale: 0.5,
        backgroundColor: "#FFFFFF",
        logging: false,
      })

      document.body.removeChild(fixedThumbnail)

      const thumbnailDataUrl = thumbnailCanvas.toDataURL("image/png")
      const thumbnailFile = dataURLtoFile(
        thumbnailDataUrl,
        `thumbnail-${resumeId}.png`
      )

      const formData = new FormData()
      formData.append("thumbnail", thumbnailFile)

      const uploadResponse = await axiosInstance.put(
        API_PATHS.RESUME.UPLOAD_IMAGES(resumeId),
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      )

      const { thumbnailLink } = uploadResponse.data
      await updateResumeDetails(thumbnailLink)

      toast.success("Resume Updated Successfully")
      navigate("/dashboard")
    } catch (error) {
      console.error("Error Uploading Images:", error)
      toast.error("Failed to upload images")
    } finally {
      setIsLoading(false)
    }
  }

  const updateResumeDetails = async (thumbnailLink) => {
    try {
      setIsLoading(true)

      await axiosInstance.put(API_PATHS.RESUME.UPDATE(resumeId), {
        ...resumeData,
        thumbnailLink: thumbnailLink || "",
        completion: completionPercentage,
      })
    } catch (err) {
      console.error("Error updating resume:", err)
      toast.error("Failed to update resume details")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteResume = async () => {
    try {
      setIsDeleting(true)
      await axiosInstance.delete(API_PATHS.RESUME.DELETE(resumeId))
      toast.success("Resume deleted successfully")
      navigate("/dashboard")
    } catch (error) {
      console.error("Error deleting resume:", error)
      toast.error("Failed to delete resume")
    } finally {
      setIsDeleting(false)
    }
  }

  const downloadPDF = async () => {
    if (isDownloading) return;

    const element = resumeDownloadRef.current;
    if (!element) {
      toast.error("Failed to generate PDF. Please try again.");
      return;
    }
  
    setIsDownloading(true);
    setDownloadSuccess(false);
    const toastId = toast.loading("Generating PDF...");

    const override = document.createElement("style");
    override.id = "__pdf_color_override__";
    override.textContent = `
      * {
        color: #000 !important;
        background-color: #fff !important;
        border-color: #000 !important;
      }
    `;
    document.head.appendChild(override);

    try {
      await document.fonts?.ready;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#FFFFFF",
        logging: false,
        windowWidth: element.scrollWidth,
      });

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const pageCanvasHeight = Math.floor((PDF_HEIGHT_MM / PDF_WIDTH_MM) * canvas.width);
      const lastContentRow = findLastContentRow(ctx, canvas);
      const contentHeight = Math.max(Math.min(lastContentRow, canvas.height), pageCanvasHeight);
      const printableHeight = contentHeight <= pageCanvasHeight * 1.03
        ? pageCanvasHeight
        : Math.min(contentHeight, canvas.height);
      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
        compress: true,
      });
      const filename = `${resumeData.title.replace(/[^a-z0-9]/gi, "_")}.pdf`;

      if (printableHeight <= pageCanvasHeight) {
        const singlePageCanvas = document.createElement("canvas");
        singlePageCanvas.width = canvas.width;
        singlePageCanvas.height = Math.min(canvas.height, printableHeight);
        const singlePageCtx = singlePageCanvas.getContext("2d");
        singlePageCtx.fillStyle = "#FFFFFF";
        singlePageCtx.fillRect(0, 0, singlePageCanvas.width, singlePageCanvas.height);
        singlePageCtx.drawImage(
          canvas,
          0,
          0,
          canvas.width,
          singlePageCanvas.height,
          0,
          0,
          singlePageCanvas.width,
          singlePageCanvas.height
        );

        const imageHeight = (singlePageCanvas.height * PDF_WIDTH_MM) / singlePageCanvas.width;
        pdf.addImage(singlePageCanvas.toDataURL("image/png"), "PNG", 0, 0, PDF_WIDTH_MM, Math.min(imageHeight, PDF_HEIGHT_MM));
      } else {
        let renderedHeight = 0;
        let isFirstPage = true;

        while (renderedHeight < printableHeight) {
          const maxEndY = Math.min(renderedHeight + pageCanvasHeight, printableHeight);
          const pageEndY = findSafePageEnd(ctx, canvas, renderedHeight, maxEndY);
          const sliceHeight = Math.max(1, pageEndY - renderedHeight);

          if (!isBlankSlice(ctx, canvas, renderedHeight, pageEndY)) {
            const pageCanvas = document.createElement("canvas");
            pageCanvas.width = canvas.width;
            pageCanvas.height = sliceHeight;
            pageCanvas
              .getContext("2d")
              .drawImage(canvas, 0, renderedHeight, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

            if (!isFirstPage) pdf.addPage();
            const imageHeight = (sliceHeight * PDF_WIDTH_MM) / canvas.width;
            pdf.addImage(pageCanvas.toDataURL("image/png"), "PNG", 0, 0, PDF_WIDTH_MM, imageHeight);
            isFirstPage = false;
          }

          renderedHeight = pageEndY > renderedHeight ? pageEndY : maxEndY;
        }
      }

      pdf.save(filename);
  
      toast.success("PDF downloaded successfully!", { id: toastId });
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);

    } catch (err) {
      console.error("PDF error:", err);
      toast.error(`Failed to generate PDF: ${err.message}`, { id: toastId });

    } finally {
      document.getElementById("__pdf_color_override__")?.remove();
      setIsDownloading(false);
    }
  };

  const updateTheme = (theme) => {
    setResumeData(prev => ({
      ...prev,
      template: {
        theme: theme,
        colorPalette: []
      }
    }));
  }

  useEffect(() => {
    if (resumeId) {
      fetchResumeDetailsById()
    }
  }, [resumeId])

  return (
    <DashboardLayout>
      <div className={containerStyles.main}>
        <div className={containerStyles.header}>
          <TitleInput
            title={resumeData.title}
            setTitle={(value) =>
              setResumeData((prev) => ({
                ...prev,
                title: value,
              }))
            }
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              className={buttonStyles.theme}
              onClick={() => setOpenThemeSelector(true)}
              disabled={isLoading || isDeleting || isDownloading}
            >
              <Palette size={16} />
              <span className="text-sm">Theme</span>
            </button>

            <button
              className={buttonStyles.delete}
              onClick={handleDeleteResume}
              disabled={isLoading || isDeleting || isDownloading}
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              <span className="text-sm">{isDeleting ? "Deleting..." : "Delete"}</span>
            </button>

            <button
              className={buttonStyles.download}
              onClick={() => setOpenPreviewModal(true)}
              disabled={isLoading || isDeleting || isDownloading}
            >
              <Download size={16} />
              <span className="text-sm">Preview</span>
            </button>
          </div>
        </div>

        <div className={containerStyles.grid}>
          <div className={containerStyles.formContainer}>
            <StepProgress progress={progress} />
            {renderForm()}
            <div className="p-4 sm:p-6">
              {errorMsg && (
                <div className={statusStyles.error}>
                  <AlertCircle size={16} /> {errorMsg}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  className={buttonStyles.back}
                  onClick={goBack}
                  disabled={isLoading || isDeleting || isDownloading}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>
                <button
                  className={buttonStyles.save}
                  onClick={uploadResumeImages}
                  disabled={isLoading || isDeleting || isDownloading}
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {isLoading ? "Saving..." : "Save & Exit"}
                </button>
                <button
                  className={buttonStyles.next}
                  onClick={validateAndNext}
                  disabled={isLoading || isDeleting || isDownloading}
                >
                  {currentPage === "additionalInfo" && <Download size={16} />}
                  {currentPage === "additionalInfo" ? "Preview & Download" : "Next"}
                  {currentPage !== "additionalInfo" && <ArrowLeft size={16} className="rotate-180" />}
                </button>
              </div>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className={containerStyles.previewContainer}>
              <div className="text-center mb-4">
                <div className={statusStyles.completionBadge}>
                  <div className={iconStyles.pulseDot}></div>
                  <span>Preview - {completionPercentage}% Complete</span>
                </div>
              </div>

              <div className="preview-container relative" ref={previewContainerRef}>
                <div className={containerStyles.previewInner}>
                  <RenderResume
                    key={`preview-${resumeData?.template?.theme}`}
                    templateId={resumeData?.template?.theme || ""}
                    resumeData={resumeData}
                    containerWidth={previewWidth}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={openThemeSelector} onClose={() => setOpenThemeSelector(false)} title="Change Theme">
        <div className={containerStyles.modalContent}>
          <ThemeSelector
            selectedTheme={resumeData?.template?.theme}
            setSelectedTheme={updateTheme}
            onClose={() => setOpenThemeSelector(false)}
          />
        </div>
      </Modal>

      <Modal
        isOpen={openPreviewModal}
        onClose={() => setOpenPreviewModal(false)}
        title={resumeData.title}
        showActionBtn
        actionBtnText={isDownloading ? "Generating..." : downloadSuccess ? "Downloaded!" : "Download PDF"}
        actionBtnIcon={
          isDownloading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : downloadSuccess ? (
            <Check size={16} className="text-white" />
          ) : (
            <Download size={16} />
          )
        }
        onActionClick={downloadPDF}
        actionBtnDisabled={isDownloading}
      >
        <div className="relative">
          <div className="text-center mb-4">
            <div className={statusStyles.modalBadge}>
              <div className={iconStyles.pulseDot}></div>
              <span>Completion: {completionPercentage}%</span>
            </div>
          </div>

          <div className={containerStyles.pdfPreview}>
            <div
              ref={resumeDownloadRef}
              className="a4-wrapper"
            >
              <div className="w-full">
              <RenderResume
                key={`pdf-${resumeData?.template?.theme}`}
                templateId={resumeData?.template?.theme || ""}
                resumeData={resumeData}
                containerWidth={null}
              />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Hidden thumbnail wrapper */}
      <div style={{ display: "none" }} ref={thumbnailRef}>
        <div className={containerStyles.hiddenThumbnail}>
          <RenderResume
            key={`thumb-${resumeData?.template?.theme}`}
            templateId={resumeData?.template?.theme || ""}
            resumeData={resumeData}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}

export default EditResume
