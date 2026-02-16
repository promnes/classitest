import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { MandatoryTaskModal } from "@/components/MandatoryTaskModal";

export const ChildGifts = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("childToken");
  const { toast } = useToast();
  const [selectedGift, setSelectedGift] = useState<any>(null);
  const isRTL = i18n.language === 'ar';

  const { data: gifts, isLoading } = useQuery({
    queryKey: ["child-gifts"],
    queryFn: async () => {
      const res = await fetch("/api/child/store", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || json || [];
    },
    refetchInterval: token ? 15000 : false,
  });

  const { data: childInfo } = useQuery({
    queryKey: ["child-info"],
    queryFn: async () => {
      const res = await fetch("/api/child/info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || json;
    },
    refetchInterval: token ? 30000 : false,
  });

  const redeemMutation = useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      const res = await fetch("/api/child/buy-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId, shippingAddress: childInfo?.shippingAddress || "" }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || t("child.notEnoughPoints"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-gifts"] });
      queryClient.invalidateQueries({ queryKey: ["child-info"] });
      setSelectedGift(null);
    },
    onError: (error: any) => {
      toast({ title: t("errors.error", "خطأ"), description: error.message, variant: "destructive" });
    },
  });

  const currentPoints = childInfo?.totalPoints || 0;

  return (
    <div className={`min-h-screen ${isDark ? "bg-gradient-to-br from-purple-900 to-indigo-900" : "bg-gradient-to-br from-purple-400 to-pink-400"} p-4 md:p-8`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Mandatory Task Modal */}
      {childInfo?.id && <MandatoryTaskModal childId={childInfo.id} />}
      
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div className="text-center md:text-right">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              🎁 {t("child.myGifts")}
            </h1>
            <p className="text-white text-opacity-80">
              {t("child.collectPointsForGifts")}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Points Display */}
            <div className={`${isDark ? "bg-yellow-500" : "bg-yellow-400"} px-6 py-3 rounded-2xl shadow-lg`}>
              <p className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-3xl">⭐</span>
                {currentPoints}
              </p>
            </div>
            
            <button
              onClick={() => navigate("/child-notifications")}
              className="relative px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg transition-all"
              data-testid="button-child-notifications"
            >
              🔔
            </button>
            
            <button
              onClick={() => navigate("/child-games")}
              className={`px-6 py-3 ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-white bg-opacity-30 hover:bg-opacity-40"} text-white font-bold rounded-xl transition-all`}
            >
              ← {t("child.back")}
            </button>
          </div>
        </div>

        {/* Progress Info */}
        <div className={`${isDark ? "bg-white bg-opacity-10" : "bg-white bg-opacity-30"} backdrop-blur-sm rounded-2xl p-6 mb-8`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-bold text-lg">🎯 {t("child.currentBalance")}</p>
              <p className="text-white text-opacity-80">{t("child.playAndEarnMore")}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate("/child-games")}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-all"
              >
                🎮 {t("child.play")}
              </button>
              <button
                onClick={() => navigate("/child-tasks")}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-all"
              >
                📝 {t("child.tasks")}
              </button>
            </div>
          </div>
        </div>

        {/* Gifts Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
          </div>
        ) : gifts?.length === 0 ? (
          <div className={`${isDark ? "bg-white bg-opacity-10" : "bg-white bg-opacity-30"} backdrop-blur-sm rounded-2xl p-12 text-center`}>
            <span className="text-8xl block mb-4">🎁</span>
            <h3 className="text-2xl font-bold text-white mb-2">{t("child.noGiftsAvailable")}</h3>
            <p className="text-white text-opacity-80">{t("child.waitForParentGifts")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gifts?.map((gift: any) => {
              const canRedeem = currentPoints >= gift.pointsPrice;
              const progress = Math.min((currentPoints / gift.pointsPrice) * 100, 100);
              const pointsNeeded = Math.max(0, gift.pointsPrice - currentPoints);
              
              return (
                <div
                  key={gift.id}
                  className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1`}
                >
                  {/* Gift Image */}
                  <div className={`h-40 ${isDark ? "bg-gray-700" : "bg-gradient-to-br from-purple-100 to-pink-100"} flex items-center justify-center relative`}>
                    {gift.image ? (
                      <img src={gift.image} alt={gift.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-7xl">🎁</span>
                    )}
                    {canRedeem && (
                      <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        ✓ {t("child.available")}
                      </div>
                    )}
                  </div>
                  
                  {/* Gift Info */}
                  <div className="p-5">
                    <h3 className={`text-xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                      {gift.name}
                    </h3>
                    <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      {gift.description || t("child.giftFromParents")}
                    </p>
                    
                    {/* Points Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className={`font-bold ${isDark ? "text-yellow-400" : "text-yellow-600"}`}>
                          ⭐ {gift.pointsPrice} {t("child.point")}
                        </span>
                        {!canRedeem && (
                          <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            {t("child.needPoints")} {pointsNeeded} {t("child.point")}
                          </span>
                        )}
                      </div>
                      <div className={`w-full h-3 ${isDark ? "bg-gray-700" : "bg-gray-200"} rounded-full overflow-hidden`}>
                        <div 
                          className={`h-full transition-all duration-500 ${canRedeem ? "bg-green-500" : "bg-yellow-400"}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    
                    {/* Redeem Button */}
                    <button
                      onClick={() => canRedeem && setSelectedGift(gift)}
                      disabled={!canRedeem}
                      className={`w-full py-3 rounded-xl font-bold transition-all ${
                        canRedeem
                          ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                          : `${isDark ? "bg-gray-700 text-gray-500" : "bg-gray-200 text-gray-400"} cursor-not-allowed`
                      }`}
                    >
                      {canRedeem ? `🎉 ${t("child.getYourGift")}` : `⏳ ${t("child.collectPoints")} ${pointsNeeded} ${t("child.point")}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Redeem Modal */}
      {selectedGift && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-3xl p-8 max-w-md w-full animate-bounce-in`}>
            <div className="text-center mb-6">
              <span className="text-8xl block mb-4">🎉</span>
              <h2 className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                {t("child.congratulations")}
              </h2>
              <p className={isDark ? "text-gray-400" : "text-gray-600"}>
                {t("child.aboutToGet")}
              </p>
            </div>
            
            <div className={`${isDark ? "bg-gray-700" : "bg-purple-50"} rounded-2xl p-6 mb-6`}>
              <h3 className={`text-xl font-bold text-center mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                {selectedGift.name}
              </h3>
              <p className={`text-center ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                {selectedGift.description}
              </p>
              <div className="text-center mt-4">
                <span className={`text-2xl font-bold ${isDark ? "text-yellow-400" : "text-yellow-600"}`}>
                  ⭐ {selectedGift.pointsPrice}
                </span>
                <span className={`${isDark ? "text-gray-400" : "text-gray-600"}`}> {t("child.willBeDeducted")}</span>
              </div>
            </div>

            <div className={`${isDark ? "bg-blue-900 bg-opacity-50" : "bg-blue-50"} rounded-xl p-4 mb-6`}>
              <p className={`text-sm ${isDark ? "text-blue-300" : "text-blue-700"}`}>
                📍 {t("child.shippingNote")}
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => redeemMutation.mutate({ orderId: selectedGift.id })}
                disabled={redeemMutation.isPending}
                className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl disabled:opacity-50"
              >
                {redeemMutation.isPending ? `⏳ ${t("child.processing")}` : `✅ ${t("child.confirm")}`}
              </button>
              <button
                onClick={() => setSelectedGift(null)}
                className={`flex-1 py-4 ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"} ${isDark ? "text-white" : "text-gray-800"} font-bold rounded-xl`}
              >
                {t("child.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
