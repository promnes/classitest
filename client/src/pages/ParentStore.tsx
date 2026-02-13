import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Search, ShoppingCart, Heart, Star, ChevronLeft, ChevronRight, 
  Filter, Grid3X3, List, Package, Truck, Shield, Clock, 
  Smartphone, Gamepad2, BookOpen, Dumbbell, Shirt, Book, Palette, Gift,
  X, Plus, Minus, CreditCard, MapPin, Check, ArrowLeft, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/contexts/ThemeContext";

const categoryIcons: Record<string, any> = {
  Smartphone, Gamepad2, BookOpen, Dumbbell, Shirt, Book, Palette, Gift, Package
};

interface Product {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  price: string;
  originalPrice?: string;
  pointsPrice: number;
  image?: string;
  stock: number;
  brand?: string;
  rating?: string;
  reviewCount?: number;
  isFeatured?: boolean;
  categoryId?: string;
  category?: { id: string; name: string; nameAr: string; icon: string; color: string };
  discountPercent?: number;
  isLibraryProduct?: boolean;
  libraryId?: string;
  libraryName?: string;
}

interface Category {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  color: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const CART_STORAGE_KEY = "parent-store-cart";

export const ParentStore = (): JSX.Element => {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const token = localStorage.getItem("token");
  
  // Read view param from URL
  const urlParams = new URLSearchParams(window.location.search);
  const initialView = urlParams.get("view") as "store" | "cart" | "orders" | null;
  
  const [activeView, setActiveView] = useState<"store" | "cart" | "orders">(initialView || "store");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedChild, setSelectedChild] = useState("");
  const [requiredPoints, setRequiredPoints] = useState("");
  const [shippingAddress, setShippingAddress] = useState({
    name: "", line1: "", city: "", state: "", postalCode: "", country: "EG"
  });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");

  const { data: categoriesData } = useQuery({
    queryKey: ["store-categories"],
    queryFn: async () => {
      const res = await fetch("/api/store/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || json || [];
    },
    enabled: !!token,
  });

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ["store-products", selectedCategory, searchQuery, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append("categoryId", selectedCategory);
      if (searchQuery) params.append("search", searchQuery);
      params.append("sort", sortBy);
      const res = await fetch(`/api/store/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || json || [];
    },
    enabled: !!token,
  });

  const { data: childrenData } = useQuery({
    queryKey: ["parent-children"],
    queryFn: async () => {
      const res = await fetch("/api/parent/children", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || [];
    },
    enabled: !!token,
  });

  const { data: paymentMethodsData } = useQuery({
    queryKey: ["/api/store/payment-methods"],
    enabled: !!token,
  });

  const { data: walletData } = useQuery({
    queryKey: ["parent-wallet"],
    queryFn: async () => {
      const res = await fetch("/api/parent/wallet", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json?.data || json;
    },
    enabled: !!token,
  });

  const { data: ordersData, isLoading: loadingOrders } = useQuery({
    queryKey: ["/api/parent/store/orders"],
    enabled: !!token,
  });

  const { data: ownedProductsData } = useQuery({
    queryKey: ["/api/parent/owned-products"],
    enabled: !!token,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Checkout failed");
      return res.json();
    },
    onSuccess: () => {
      setCart([]);
      setShowCheckout(false);
      queryClient.invalidateQueries({ queryKey: ["parent-wallet"] });
      queryClient.invalidateQueries({ queryKey: ["parent-owned-products"] });
    },
  });

  const assignProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/parent/assign-product", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Assignment failed");
      return res.json();
    },
    onSuccess: () => {
      setShowAssign(false);
      setSelectedProduct(null);
      setSelectedChild("");
      setRequiredPoints("");
      queryClient.invalidateQueries({ queryKey: ["parent-owned-products"] });
    },
  });

  const categories: Category[] = categoriesData?.data || categoriesData || [];
  const products: Product[] = productsData?.data || productsData || [];
  const children = childrenData || [];
  const paymentMethods = (paymentMethodsData as any)?.data || paymentMethodsData || [];
  const wallet = walletData?.data || walletData;
  const referralCode = new URLSearchParams(window.location.search).get("ref");
  const ordersList: any[] = Array.isArray(ordersData) ? ordersData : (ordersData as any)?.data || [];
  const inventoryList: any[] = Array.isArray(ownedProductsData) ? ownedProductsData : (ownedProductsData as any)?.data || [];

  const featuredProducts = useMemo(() => 
    products.filter((p: Product) => p.isFeatured).slice(0, 6), [products]
  );

  const cartItemsCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const cartTotal = useMemo(() => 
    cart.reduce((sum, item) => sum + parseFloat(item.product.price) * item.quantity, 0), [cart]
  );

  useEffect(() => {
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (!storedCart) return;
      const parsed = JSON.parse(storedCart);
      if (Array.isArray(parsed)) {
        setCart(parsed);
      }
    } catch {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(
      new CustomEvent("parent-store-cart-updated", { detail: { count: cartItemsCount } })
    );
  }, [cart, cartItemsCount]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity } : item
    ));
  };

  const handleCheckout = () => {
    checkoutMutation.mutate({
      items: cart.map(item => ({ productId: item.product.id, quantity: item.quantity })),
      paymentMethodId: selectedPaymentMethod,
      shippingAddress,
      totalAmount: cartTotal,
      referralCode,
    });
  };

  const renderStars = (rating: string = "4.5") => {
    const stars = parseFloat(rating);
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <Star 
            key={i} 
            className={`w-3 h-3 ${i <= stars ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} 
          />
        ))}
      </div>
    );
  };

  const getCategoryIcon = (iconName: string) => {
    const IconComponent = categoryIcons[iconName] || Package;
    return IconComponent;
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"}`} dir="rtl">
      <header className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <button 
              onClick={() => navigate("/parent-dashboard")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              data-testid="button-back-dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6" />
                <span className="text-xl font-bold">كلاسيفاي ستور</span>
              </div>
            </button>

            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="ابحث عن منتجات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-12 pr-4 py-2 rounded-lg border-0 ${isDark ? "bg-gray-700 text-gray-200 placeholder-gray-400" : "bg-white text-gray-800 placeholder-gray-500"}`}
                  data-testid="input-search"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-xs opacity-80">رصيد المحفظة</p>
                <p className="font-bold">{wallet?.balance || 0} ج.م</p>
              </div>
              
              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
                data-testid="button-open-cart"
              >
                <ShoppingCart className="w-6 h-6" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-yellow-400 text-gray-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-orange-700/50 py-2">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`whitespace-nowrap px-3 py-1 rounded-full text-sm transition-colors ${
                  !selectedCategory ? "bg-white text-orange-600 font-bold" : "hover:bg-white/10"
                }`}
                data-testid="button-category-all"
              >
                الكل
              </button>
              <button
                onClick={() => navigate("/library-store")}
                className="whitespace-nowrap px-3 py-1 rounded-full text-sm flex items-center gap-2 transition-colors bg-blue-600 text-white hover:bg-blue-700"
                data-testid="button-library-store"
              >
                <BookOpen className="w-4 h-4" />
                المكتبات
              </button>
              {categories.map((cat: Category) => {
                const Icon = getCategoryIcon(cat.icon);
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`whitespace-nowrap px-3 py-1 rounded-full text-sm flex items-center gap-2 transition-colors ${
                      selectedCategory === cat.id ? "bg-white text-orange-600 font-bold" : "hover:bg-white/10"
                    }`}
                    data-testid={`button-category-${cat.id}`}
                  >
                    <Icon className="w-4 h-4" />
                    {cat.nameAr}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* View Tabs */}
      <div className={`border-b ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            {[
              { id: "store" as const, label: "🛍️ المتجر", icon: Package },
              { id: "cart" as const, label: `🛒 السلة (${cartItemsCount})`, icon: ShoppingCart },
              { id: "orders" as const, label: `📦 طلباتي (${ordersList.length})`, icon: Clock },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeView === tab.id
                    ? "bg-orange-500 text-white shadow-md"
                    : isDark
                    ? "text-gray-300 hover:bg-gray-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              onClick={() => navigate("/parent-inventory")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              📋 مخزوني ({inventoryList.length})
            </button>
          </div>
        </div>
      </div>

      {/* Orders View */}
      {activeView === "orders" && (
        <main className="max-w-4xl mx-auto px-4 py-6">
          <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-800"}`}>
            <Package className="w-6 h-6 text-orange-500" />
            طلباتي
          </h2>
          {loadingOrders ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : ordersList.length === 0 ? (
            <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
              <CardContent className="text-center py-16">
                <Package className={`w-16 h-16 mx-auto mb-4 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                <h3 className={`text-xl font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>لا توجد طلبات بعد</h3>
                <p className={`mb-6 ${isDark ? "text-gray-500" : "text-gray-400"}`}>تصفح المتجر واشترِ منتجات</p>
                <Button onClick={() => setActiveView("store")} className="bg-orange-500 hover:bg-orange-600">
                  تصفح المتجر
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {ordersList.map((order: any) => (
                <Card key={order.id} className={`overflow-hidden ${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                          طلب #{order.id?.slice(0, 8)}
                        </p>
                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString("ar-EG", { 
                            year: "numeric", month: "long", day: "numeric" 
                          }) : ""}
                        </p>
                      </div>
                      <div className="text-left">
                        <Badge variant={
                          order.status === "completed" || order.status === "delivered" ? "default" :
                          order.status === "cancelled" ? "destructive" : "secondary"
                        }>
                          {order.status === "completed" || order.status === "delivered" ? "✅ مكتمل" :
                           order.status === "pending" ? "⏳ قيد المعالجة" :
                           order.status === "processing" ? "🔄 جاري التجهيز" :
                           order.status === "shipped" ? "🚚 تم الشحن" :
                           order.status === "cancelled" ? "❌ ملغي" : order.status}
                        </Badge>
                        <p className={`text-lg font-bold mt-1 ${isDark ? "text-orange-400" : "text-orange-600"}`}>
                          {order.totalAmount} ج.م
                        </p>
                      </div>
                    </div>
                    {order.shippingAddress && (
                      <div className={`text-sm flex items-center gap-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        <MapPin className="w-3.5 h-3.5" />
                        {typeof order.shippingAddress === "string" 
                          ? order.shippingAddress 
                          : `${order.shippingAddress.city || ""} - ${order.shippingAddress.line1 || ""}`}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      )}

      {/* Cart View (inline, not dialog) */}
      {activeView === "cart" && (
        <main className="max-w-2xl mx-auto px-4 py-6">
          <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDark ? "text-white" : "text-gray-800"}`}>
            <ShoppingCart className="w-6 h-6 text-orange-500" />
            سلة التسوق
          </h2>
          {cart.length === 0 ? (
            <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
              <CardContent className="text-center py-16">
                <ShoppingCart className={`w-16 h-16 mx-auto mb-4 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
                <h3 className={`text-xl font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>السلة فارغة</h3>
                <p className={`mb-6 ${isDark ? "text-gray-500" : "text-gray-400"}`}>أضف منتجات من المتجر</p>
                <Button onClick={() => setActiveView("store")} className="bg-orange-500 hover:bg-orange-600">
                  تصفح المتجر
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <Card key={item.product.id} className={isDark ? "bg-gray-800 border-gray-700" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                        {item.product.image ? (
                          <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className={`w-6 h-6 ${isDark ? "text-gray-500" : "text-gray-300"}`} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                          {item.product.nameAr || item.product.name}
                        </h4>
                        <p className={`text-sm ${isDark ? "text-orange-400" : "text-orange-600"} font-bold`}>
                          {item.product.price} ج.م
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "bg-gray-700 text-white" : "bg-gray-200"}`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className={`font-bold w-6 text-center ${isDark ? "text-white" : ""}`}>{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "bg-gray-700 text-white" : "bg-gray-200"}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(item.product.id)} className="text-red-500 hover:text-red-700">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-800"}`}>المجموع</span>
                    <span className="text-xl font-bold text-orange-600">{cartTotal.toFixed(2)} ج.م</span>
                  </div>
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    onClick={() => setShowCheckout(true)}
                    disabled={cart.length === 0}
                  >
                    <CreditCard className="w-4 h-4 ml-2" />
                    إتمام الشراء
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      )}

      {/* Store View */}
      {activeView === "store" && (
      <>
      <div className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-b"} shadow-sm py-2`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className={`flex items-center justify-between gap-4 text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-green-500" />
                <span>توصيل سريع</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <span>ضمان الجودة</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span>دعم 24/7</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 h-8 text-xs" data-testid="select-sort">
                  <SelectValue placeholder="ترتيب حسب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">الأكثر مبيعاً</SelectItem>
                  <SelectItem value="price_asc">السعر: الأقل</SelectItem>
                  <SelectItem value="price_desc">السعر: الأعلى</SelectItem>
                  <SelectItem value="newest">الأحدث</SelectItem>
                  <SelectItem value="rating">التقييم</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1 rounded ${viewMode === "grid" ? "bg-orange-100 text-orange-600" : ""}`}
                  data-testid="button-view-grid"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1 rounded ${viewMode === "list" ? "bg-orange-100 text-orange-600" : ""}`}
                  data-testid="button-view-list"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!selectedCategory && !searchQuery && featuredProducts.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                <Sparkles className="w-5 h-5 text-orange-500" />
                المنتجات المميزة
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {featuredProducts.map((product: Product) => (
                <Card 
                  key={product.id} 
                  className="group cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden border-0 bg-white"
                  onClick={() => {
                    setSelectedProduct(product);
                    setShowAssign(true);
                    setRequiredPoints(product.pointsPrice.toString());
                  }}
                  data-testid={`card-featured-product-${product.id}`}
                >
                  <div className={`relative aspect-square overflow-hidden ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className={`w-12 h-12 ${isDark ? "text-gray-500" : "text-gray-300"}`} />
                      </div>
                    )}
                    {(product.discountPercent && product.discountPercent > 0) ? (
                      <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold">
                        -{product.discountPercent}%
                      </Badge>
                    ) : product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                      <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold">
                        -{Math.round((1 - parseFloat(product.price) / parseFloat(product.originalPrice)) * 100)}%
                      </Badge>
                    )}
                    {product.isLibraryProduct && (
                      <Badge className="absolute bottom-2 left-2 bg-purple-500 text-white text-xs">
                        {product.libraryName || "مكتبة"}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{product.brand || "Classify"}</p>
                    <h3 className={`font-medium text-sm line-clamp-2 mb-2 ${isDark ? "text-gray-200" : "text-gray-800"}`}>{product.nameAr || product.name}</h3>
                    <div className="flex items-center gap-1 mb-2">
                      {renderStars(product.rating)}
                      <span className="text-xs text-gray-400">({product.reviewCount || 0})</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-bold ${isDark ? "text-orange-400" : "text-orange-600"}`}>{product.price} ج.م</p>
                        {product.originalPrice && (
                          <p className="text-xs text-gray-400 line-through">{product.originalPrice} ج.م</p>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-orange-500 hover:bg-orange-600 h-8 w-8 p-0"
                        onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                        data-testid={`button-add-cart-${product.id}`}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
              {selectedCategory 
                ? categories.find((c: Category) => c.id === selectedCategory)?.nameAr || "المنتجات"
                : searchQuery ? `نتائج البحث: "${searchQuery}"` : "جميع المنتجات"
              }
            </h2>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{products.length} منتج</p>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-square bg-gray-200" />
                  <CardContent className="p-3 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">لا توجد منتجات</h3>
              <p className="text-gray-400">جرب البحث بكلمات أخرى أو اختر فئة مختلفة</p>
            </div>
          ) : (
            <div className={viewMode === "grid" 
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
              : "space-y-4"
            }>
              {products.map((product: Product) => (
                viewMode === "grid" ? (
                  <Card 
                    key={product.id} 
                    className={`group cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden border-0 ${isDark ? "bg-gray-800" : "bg-white"}`}
                    data-testid={`card-product-${product.id}`}
                  >
                    <div 
                      className={`relative aspect-square overflow-hidden ${isDark ? "bg-gray-700" : "bg-gray-100"}`}
                      onClick={() => {
                        setSelectedProduct(product);
                        setShowAssign(true);
                        setRequiredPoints(product.pointsPrice.toString());
                      }}
                    >
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                      {(product.discountPercent && product.discountPercent > 0) ? (
                        <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold">
                          -{product.discountPercent}%
                        </Badge>
                      ) : product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                        <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold">
                          -{Math.round((1 - parseFloat(product.price) / parseFloat(product.originalPrice)) * 100)}%
                        </Badge>
                      )}
                      {product.isLibraryProduct && (
                        <Badge className="absolute bottom-2 left-2 bg-purple-500 text-white text-xs">
                          {product.libraryName || "مكتبة"}
                        </Badge>
                      )}
                      <button 
                        className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Heart className="w-4 h-4 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                    <CardContent className="p-3">
                      <p className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{product.brand || "Classify"}</p>
                      <h3 className={`font-medium text-sm line-clamp-2 mb-2 h-10 ${isDark ? "text-gray-200" : "text-gray-800"}`}>{product.nameAr || product.name}</h3>
                      <div className="flex items-center gap-1 mb-2">
                        {renderStars(product.rating)}
                        <span className="text-xs text-gray-400">({product.reviewCount || 0})</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`font-bold text-lg ${isDark ? "text-orange-400" : "text-orange-600"}`}>{product.price} ج.م</p>
                          {product.originalPrice && (
                            <p className="text-xs text-gray-400 line-through">{product.originalPrice} ج.م</p>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-orange-500 hover:bg-orange-600"
                          onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                          data-testid={`button-add-cart-${product.id}`}
                        >
                          <ShoppingCart className="w-4 h-4 ml-1" />
                          أضف
                        </Button>
                      </div>
                      <div className={`mt-2 pt-2 border-t ${isDark ? "border-gray-700" : ""}`}>
                        <p className={`text-xs flex items-center gap-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          <Star className="w-3 h-3 text-yellow-500" />
                          يحتاج <span className="font-bold text-orange-600">{product.pointsPrice}</span> نقطة
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card 
                    key={product.id} 
                    className={`flex overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${isDark ? "bg-gray-800 border-gray-700" : ""}`}
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowAssign(true);
                      setRequiredPoints(product.pointsPrice.toString());
                    }}
                    data-testid={`card-product-list-${product.id}`}
                  >
                    <div className={`relative w-40 h-40 flex-shrink-0 ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                      {(product.discountPercent && product.discountPercent > 0) ? (
                        <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold">
                          -{product.discountPercent}%
                        </Badge>
                      ) : product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                        <Badge className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold">
                          -{Math.round((1 - parseFloat(product.price) / parseFloat(product.originalPrice)) * 100)}%
                        </Badge>
                      )}
                      {product.isLibraryProduct && (
                        <Badge className="absolute bottom-2 left-2 bg-purple-500 text-white text-xs">
                          {product.libraryName || "مكتبة"}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <p className={`text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{product.brand || "Classify"}</p>
                        <h3 className={`font-medium mb-2 ${isDark ? "text-gray-200" : "text-gray-800"}`}>{product.nameAr || product.name}</h3>
                        <p className={`text-sm line-clamp-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{product.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {renderStars(product.rating)}
                          <span className="text-xs text-gray-400">({product.reviewCount || 0} تقييم)</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <div>
                          <p className={`text-xl font-bold ${isDark ? "text-orange-400" : "text-orange-600"}`}>{product.price} ج.م</p>
                          <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>النقاط المطلوبة: {product.pointsPrice}</p>
                        </div>
                        <Button 
                          className="bg-orange-500 hover:bg-orange-600"
                          onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                        >
                          <ShoppingCart className="w-4 h-4 ml-2" />
                          أضف للسلة
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              ))}
            </div>
          )}
        </section>
      </main>
      </>
      )}

      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              سلة التسوق ({cart.length} منتج)
            </DialogTitle>
          </DialogHeader>
          
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">السلة فارغة</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                      {item.product.image ? (
                        <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{item.product.nameAr || item.product.name}</h4>
                      <p className="text-orange-600 font-bold">{item.product.price} ج.م</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 w-8 p-0"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 w-8 p-0"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-red-500 h-8 w-8 p-0"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 mt-4 space-y-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>المجموع:</span>
                  <span className="text-orange-600">{cartTotal.toFixed(2)} ج.م</span>
                </div>
                <Button 
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  onClick={() => { setShowCart(false); setShowCheckout(true); }}
                  data-testid="button-proceed-checkout"
                >
                  <CreditCard className="w-4 h-4 ml-2" />
                  إتمام الشراء
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              إتمام الشراء
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                عنوان الشحن
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="الاسم الكامل"
                  value={shippingAddress.name}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, name: e.target.value }))}
                  data-testid="input-shipping-name"
                />
                <Input
                  placeholder="المدينة"
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                  data-testid="input-shipping-city"
                />
                <Input
                  placeholder="العنوان التفصيلي"
                  value={shippingAddress.line1}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, line1: e.target.value }))}
                  className="col-span-2"
                  data-testid="input-shipping-address"
                />
                <Input
                  placeholder="المنطقة/الحي"
                  value={shippingAddress.state}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, state: e.target.value }))}
                />
                <Input
                  placeholder="الرمز البريدي"
                  value={shippingAddress.postalCode}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                طريقة الدفع
              </h3>
              <div className="space-y-2">
                {paymentMethods.length === 0 ? (
                  <p className="text-gray-500 text-sm">لا توجد طرق دفع متاحة</p>
                ) : (
                  paymentMethods.map((method: any) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                      className={`w-full p-3 border rounded-lg text-right flex items-center gap-3 transition-colors ${
                        selectedPaymentMethod === method.id ? "border-orange-500 bg-orange-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPaymentMethod === method.id ? "border-orange-500" : "border-gray-300"
                      }`}>
                        {selectedPaymentMethod === method.id && (
                          <div className="w-3 h-3 bg-orange-500 rounded-full" />
                        )}
                      </div>
                      <span>{method.name || method.type}</span>
                    </button>
                  ))
                )}
                
                <button
                  onClick={() => setSelectedPaymentMethod("wallet")}
                  className={`w-full p-3 border rounded-lg text-right flex items-center gap-3 transition-colors ${
                    selectedPaymentMethod === "wallet" ? "border-orange-500 bg-orange-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPaymentMethod === "wallet" ? "border-orange-500" : "border-gray-300"
                  }`}>
                    {selectedPaymentMethod === "wallet" && (
                      <div className="w-3 h-3 bg-orange-500 rounded-full" />
                    )}
                  </div>
                  <span>الدفع من المحفظة (الرصيد: {wallet?.balance || 0} ج.م)</span>
                </button>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold mb-3">ملخص الطلب</h3>
              <div className="space-y-2 text-sm">
                {cart.map(item => (
                  <div key={item.product.id} className="flex justify-between">
                    <span>{item.product.nameAr || item.product.name} x{item.quantity}</span>
                    <span>{(parseFloat(item.product.price) * item.quantity).toFixed(2)} ج.م</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                  <span>المجموع:</span>
                  <span className="text-orange-600">{cartTotal.toFixed(2)} ج.م</span>
                </div>
              </div>
            </div>

            <Button 
              className="w-full bg-orange-500 hover:bg-orange-600 py-6 text-lg"
              onClick={handleCheckout}
              disabled={checkoutMutation.isPending || !selectedPaymentMethod}
              data-testid="button-confirm-checkout"
            >
              {checkoutMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري المعالجة...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  تأكيد الشراء
                </span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-orange-500" />
              تعيين المنتج كهدية
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl">
                <div className="w-20 h-20 bg-white rounded-lg overflow-hidden shadow-sm">
                  {selectedProduct.image ? (
                    <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">{selectedProduct.nameAr || selectedProduct.name}</h4>
                  <p className="text-orange-600 font-bold text-lg">{selectedProduct.price} ج.م</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">اختر الطفل</label>
                <Select value={selectedChild} onValueChange={setSelectedChild}>
                  <SelectTrigger data-testid="select-child">
                    <SelectValue placeholder="اختر طفلاً..." />
                  </SelectTrigger>
                  <SelectContent>
                    {children.map((child: any) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.name} ({child.totalPoints || 0} نقطة)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">النقاط المطلوبة للحصول على الهدية</label>
                <Input
                  type="number"
                  value={requiredPoints}
                  onChange={(e) => setRequiredPoints(e.target.value)}
                  placeholder="مثال: 100"
                  data-testid="input-required-points"
                />
                <p className="text-xs text-gray-500 mt-1">
                  سيحتاج الطفل جمع هذا العدد من النقاط للحصول على الهدية
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                  onClick={() => {
                    addToCart(selectedProduct);
                    assignProductMutation.mutate({
                      productId: selectedProduct.id,
                      childId: selectedChild,
                      requiredPoints: parseInt(requiredPoints),
                    });
                  }}
                  disabled={!selectedChild || !requiredPoints || assignProductMutation.isPending}
                  data-testid="button-assign-product"
                >
                  {assignProductMutation.isPending ? "جاري..." : "شراء وتعيين كهدية"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { addToCart(selectedProduct); setShowAssign(false); }}
                >
                  أضف للسلة فقط
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ParentStore;
