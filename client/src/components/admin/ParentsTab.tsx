import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Eye, Send, Mail, Phone, Calendar, Wallet, ListTodo, Share2, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Parent {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  uniqueCode: string;
  childrenCount: number;
  walletBalance: number;
  tasksCount: number;
  publicTasksCount: number;
  createdAt: string;
  children: Array<{ id: string; name: string; totalPoints: number }>;
}

interface ParentDetails extends Parent {
  wallet: { balance: number };
  tasks: Array<{ id: string; question: string; status: string }>;
  templateTasks: Array<{ id: string; title: string; isPublic: boolean; usageCount: number }>;
  earnings: { total: number; transactions: any[] };
  referral: { code: string; totalReferrals: number; activeReferrals: number } | null;
}

export function ParentsTab({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [selectedParent, setSelectedParent] = useState<ParentDetails | null>(null);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyForm, setNotifyForm] = useState({ title: "", message: "", imageUrl: "" });
  const [searchTerm, setSearchTerm] = useState("");

  const { data: parents, isLoading, error } = useQuery({
    queryKey: ["admin-parents"],
    queryFn: async () => {
      const res = await fetch("/api/admin/parents", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "فشل تحميل البيانات");
      }
      const data = await res.json();
      return data.data || [];
    },
  });

  const getParentDetails = async (id: string) => {
    const res = await fetch(`/api/admin/parents/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  };

  const sendNotificationMutation = useMutation({
    mutationFn: async ({ parentId, data }: { parentId: string; data: typeof notifyForm }) => {
      const res = await fetch(`/api/admin/parents/${parentId}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      setShowNotifyModal(false);
      setNotifyForm({ title: "", message: "", imageUrl: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-parent-notifications"] });
    },
  });

  const handleViewDetails = async (parent: Parent) => {
    const details = await getParentDetails(parent.id);
    if (details) {
      setSelectedParent(details);
    }
  };

  const handleSendNotification = () => {
    if (!selectedParent || !notifyForm.title || !notifyForm.message) return;
    sendNotificationMutation.mutate({ parentId: selectedParent.id, data: notifyForm });
  };

  const filteredParents = parents?.filter((p: Parent) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phoneNumber?.includes(searchTerm)
  ) || [];

  if (isLoading) {
    return <div className="p-4">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          إدارة الآباء
        </h2>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{parents?.length || 0} والد</Badge>
          <Input
            placeholder="بحث بالاسم أو البريد..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
            data-testid="input-search-parents"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredParents.map((parent: Parent) => (
          <Card key={parent.id} className="hover-elevate cursor-pointer" data-testid={`card-parent-${parent.id}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{parent.name}</CardTitle>
                <Badge variant="outline">{parent.childrenCount} طفل</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{parent.email}</span>
                </div>
                {parent.phoneNumber && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{parent.phoneNumber}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(parent.createdAt).toLocaleDateString("ar-SA")}</span>
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary">
                    <Wallet className="h-3 w-3 ml-1" />
                    {parent.walletBalance} ر.س
                  </Badge>
                  <Badge variant="outline">
                    <ListTodo className="h-3 w-3 ml-1" />
                    {parent.tasksCount} مهمة
                  </Badge>
                  {parent.publicTasksCount > 0 && (
                    <Badge>
                      <Share2 className="h-3 w-3 ml-1" />
                      {parent.publicTasksCount} عامة
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewDetails(parent)}
                  data-testid={`button-view-parent-${parent.id}`}
                >
                  <Eye className="h-4 w-4 ml-1" />
                  التفاصيل
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    const details = await getParentDetails(parent.id);
                    if (details) {
                      setSelectedParent(details);
                      setShowNotifyModal(true);
                    }
                  }}
                  data-testid={`button-notify-parent-${parent.id}`}
                >
                  <Send className="h-4 w-4 ml-1" />
                  إشعار
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredParents.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>لا يوجد آباء مسجلين</p>
        </div>
      )}

      {selectedParent && !showNotifyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{selectedParent.name}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedParent(null)}
                data-testid="button-close-parent-details"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">البريد الإلكتروني</div>
                <div className="font-medium">{selectedParent.email}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">الهاتف</div>
                <div className="font-medium">{selectedParent.phoneNumber || "غير محدد"}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">الرصيد</div>
                <div className="font-medium">{selectedParent.wallet?.balance || 0} ر.س</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">الأرباح</div>
                <div className="font-medium">{selectedParent.earnings?.total || 0} نقطة</div>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-medium mb-2">الأطفال ({selectedParent.children?.length || 0})</h4>
              <div className="flex gap-2 flex-wrap">
                {selectedParent.children?.map((child) => (
                  <Badge key={child.id} variant="outline">
                    {child.name} - {child.totalPoints} نقطة
                  </Badge>
                ))}
              </div>
            </div>

            {selectedParent.referral && (
              <div className="mb-4 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">كود الإحالة</h4>
                <div className="flex gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">الكود: </span>
                    <span className="font-mono font-bold">{selectedParent.referral.code}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">الإحالات: </span>
                    <span>{selectedParent.referral.totalReferrals}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">النشطة: </span>
                    <span>{selectedParent.referral.activeReferrals}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4">
              <h4 className="font-medium mb-2">المهام العامة ({selectedParent.templateTasks?.filter(t => t.isPublic).length || 0})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedParent.templateTasks?.filter(t => t.isPublic).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{task.title}</span>
                    <Badge variant="secondary">{task.usageCount} استخدام</Badge>
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => setShowNotifyModal(true)}
              data-testid="button-send-notification-from-details"
            >
              <Send className="h-4 w-4 ml-2" />
              إرسال إشعار
            </Button>
          </div>
        </div>
      )}

      {showNotifyModal && selectedParent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">إرسال إشعار لـ {selectedParent.name}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowNotifyModal(false);
                  setNotifyForm({ title: "", message: "", imageUrl: "" });
                }}
                data-testid="button-close-notify-modal"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">العنوان</label>
                <Input
                  value={notifyForm.title}
                  onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })}
                  placeholder="عنوان الإشعار"
                  data-testid="input-notify-title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الرسالة</label>
                <Textarea
                  value={notifyForm.message}
                  onChange={(e) => setNotifyForm({ ...notifyForm, message: e.target.value })}
                  placeholder="نص الرسالة"
                  rows={3}
                  data-testid="input-notify-message"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">رابط الصورة (اختياري)</label>
                <div className="flex gap-2">
                  <Image className="h-5 w-5 text-muted-foreground mt-2" />
                  <Input
                    value={notifyForm.imageUrl}
                    onChange={(e) => setNotifyForm({ ...notifyForm, imageUrl: e.target.value })}
                    placeholder="https://..."
                    data-testid="input-notify-image"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                onClick={handleSendNotification}
                disabled={sendNotificationMutation.isPending || !notifyForm.title || !notifyForm.message}
                className="flex-1"
                data-testid="button-send-notification"
              >
                {sendNotificationMutation.isPending ? "جاري الإرسال..." : "إرسال"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowNotifyModal(false);
                  setNotifyForm({ title: "", message: "", imageUrl: "" });
                }}
                className="flex-1"
                data-testid="button-cancel-notification"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
