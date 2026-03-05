import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Users, BookOpen, Shield, Trophy, ChevronLeft, ChevronRight, X } from "lucide-react";

const ONBOARDING_KEY = "classify_onboarding_completed";

interface OnboardingStep {
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  color: string;
}

const steps: OnboardingStep[] = [
  {
    icon: <Users className="h-16 w-16" />,
    titleKey: "onboarding.step1Title",
    descriptionKey: "onboarding.step1Description",
    color: "from-blue-500 to-indigo-600",
  },
  {
    icon: <BookOpen className="h-16 w-16" />,
    titleKey: "onboarding.step2Title",
    descriptionKey: "onboarding.step2Description",
    color: "from-green-500 to-emerald-600",
  },
  {
    icon: <Trophy className="h-16 w-16" />,
    titleKey: "onboarding.step3Title",
    descriptionKey: "onboarding.step3Description",
    color: "from-yellow-500 to-orange-600",
  },
  {
    icon: <Shield className="h-16 w-16" />,
    titleKey: "onboarding.step4Title",
    descriptionKey: "onboarding.step4Description",
    color: "from-purple-500 to-pink-600",
  },
];

export function OnboardingWizard() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setOpen(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!open) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleSkip(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 rounded-2xl" dir={isRTL ? "rtl" : "ltr"}>
        <button
          onClick={handleSkip}
          className="absolute top-3 left-3 z-10 p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
          aria-label="Skip"
        >
          <X className="h-4 w-4" />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
            transition={{ duration: 0.3 }}
          >
            <div className={`bg-gradient-to-br ${step.color} p-8 text-center text-white`}>
              <div className="flex justify-center mb-4 opacity-90">
                {step.icon}
              </div>
              <h2 className="text-xl font-bold mb-2">
                {t(step.titleKey)}
              </h2>
              <p className="text-sm opacity-90 leading-relaxed">
                {t(step.descriptionKey)}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="p-5 space-y-4">
          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentStep ? "w-6 bg-blue-500" : "w-2 bg-gray-300 dark:bg-gray-600"
                }`}
                aria-label={`Step ${i + 1}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="gap-1"
            >
              {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              {t("onboarding.previous")}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-gray-500"
            >
              {t("onboarding.skip")}
            </Button>

            <Button
              onClick={handleNext}
              size="sm"
              className={`gap-1 bg-gradient-to-r ${step.color} text-white hover:opacity-90`}
            >
              {isLast ? t("onboarding.startNow") : t("onboarding.next")}
              {!isLast && (isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default OnboardingWizard;
