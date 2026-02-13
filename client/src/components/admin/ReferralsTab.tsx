import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Gift, TrendingUp, Clock, CheckCircle, Star } from "lucide-react";
import { getDateLocale } from "@/i18n/config";

interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  referralCode: string;
  status: string;
  pointsAwarded: number;
  referredAt: string;
  activatedAt: string | null;
  rewardedAt: string | null;
  referrerName: string;
  referrerEmail: string;
  referredName: string;
  referredEmail: string;
}

interface ReferralStats {
  total: number;
  active: number;
  pending: number;
  rewarded: number;
  totalPointsAwarded: number;
}

interface ReferralCode {
  id: string;
  parentId: string;
  code: string;
  totalReferrals: number;
  activeReferrals: number;
  totalPointsEarned: number;
  createdAt: string;
  parentName: string;
  parentEmail: string;
}

export function ReferralsTab({ token }: { token: string }) {
  const [activeView, setActiveView] = useState<"referrals" | "codes">("referrals");

  const { data: stats } = useQuery<ReferralStats>({
    queryKey: ["admin-referral-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/referrals/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.data;
    },
  });

  const { data: referrals } = useQuery<Referral[]>({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const res = await fetch("/api/admin/referrals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.data || [];
    },
  });

  const { data: codes } = useQuery<ReferralCode[]>({
    queryKey: ["admin-referral-codes"],
    queryFn: async () => {
      const res = await fetch("/api/admin/referral-codes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.data || [];
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">نشط</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">معلق</Badge>;
      case "rewarded":
        return <Badge className="bg-blue-500">تم المكافأة</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-sm text-muted-foreground">إجمالي الإحالات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.active || 0}</p>
                <p className="text-sm text-muted-foreground">نشطة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.pending || 0}</p>
                <p className="text-sm text-muted-foreground">معلقة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Gift className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.rewarded || 0}</p>
                <p className="text-sm text-muted-foreground">مُكافأة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Star className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.totalPointsAwarded || 0}</p>
                <p className="text-sm text-muted-foreground">نقاط موزعة</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveView("referrals")}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeView === "referrals" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
          data-testid="button-view-referrals"
        >
          الإحالات
        </button>
        <button
          onClick={() => setActiveView("codes")}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeView === "codes" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
          data-testid="button-view-codes"
        >
          أكواد الإحالة
        </button>
      </div>

      {activeView === "referrals" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              سجل الإحالات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!referrals?.length ? (
              <p className="text-center text-muted-foreground py-8">لا توجد إحالات بعد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right p-3">المُحيل</th>
                      <th className="text-right p-3">المُحال</th>
                      <th className="text-right p-3">الكود</th>
                      <th className="text-right p-3">الحالة</th>
                      <th className="text-right p-3">النقاط</th>
                      <th className="text-right p-3">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((ref) => (
                      <tr key={ref.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{ref.referrerName}</p>
                            <p className="text-sm text-muted-foreground">{ref.referrerEmail}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{ref.referredName}</p>
                            <p className="text-sm text-muted-foreground">{ref.referredEmail}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <code className="bg-muted px-2 py-1 rounded">{ref.referralCode}</code>
                        </td>
                        <td className="p-3">{getStatusBadge(ref.status)}</td>
                        <td className="p-3 font-bold text-green-600">{ref.pointsAwarded}</td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(ref.referredAt).toLocaleDateString(getDateLocale())}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              أكواد الإحالة
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!codes?.length ? (
              <p className="text-center text-muted-foreground py-8">لا توجد أكواد إحالة بعد</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right p-3">الوالد</th>
                      <th className="text-right p-3">الكود</th>
                      <th className="text-right p-3">إجمالي الإحالات</th>
                      <th className="text-right p-3">نشطة</th>
                      <th className="text-right p-3">النقاط المكتسبة</th>
                      <th className="text-right p-3">تاريخ الإنشاء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codes.map((code) => (
                      <tr key={code.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{code.parentName}</p>
                            <p className="text-sm text-muted-foreground">{code.parentEmail}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <code className="bg-primary/10 text-primary px-2 py-1 rounded font-bold">
                            {code.code}
                          </code>
                        </td>
                        <td className="p-3 font-bold">{code.totalReferrals}</td>
                        <td className="p-3">
                          <Badge className="bg-green-500">{code.activeReferrals}</Badge>
                        </td>
                        <td className="p-3 font-bold text-amber-600">{code.totalPointsEarned}</td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(code.createdAt).toLocaleDateString(getDateLocale())}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
