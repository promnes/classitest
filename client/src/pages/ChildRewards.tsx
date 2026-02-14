import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ChildRewards() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const token = localStorage.getItem("childToken");
  
  const { data: rewardsRaw, isLoading } = useQuery({
    queryKey: ["/api/child/rewards"],
    enabled: !!token,
  });
  
  const rewards = Array.isArray(rewardsRaw) ? rewardsRaw : [];

  if (isLoading) return <div>{t("common.loading")}</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">{t("child.myRewards")}</h2>
      {rewards.length === 0 && <div>{t("child.noRewards")}</div>}
      <ul className="space-y-3">
        {rewards.map((r: any) => (
          <li key={r.id} className="p-3 border rounded">
            <div className="flex justify-between gap-2 flex-wrap">
              <div>
                <div className="font-semibold">{r.productName}</div>
                <div className="text-sm text-gray-600">{t("child.progress")}: {r.progress || 0}%</div>
              </div>
              <div>
                <Button onClick={() => toast({ title: t("child.redeemReward") })} className="bg-indigo-600">{t("child.redeemReward")}</Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
