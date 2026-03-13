import { useState, useMemo, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, ShoppingCart, Heart, Star, ChevronLeft, ChevronRight, ChevronDown,
  Filter, Grid3X3, List, Package, Truck, Shield, Clock, 
  Smartphone, Gamepad2, BookOpen, Dumbbell, Shirt, Book, Palette, Gift,
  X, Plus, Minus, CreditCard, MapPin, Check, ArrowLeft, Sparkles, MoreVertical, Boxes
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductImageCarousel } from "@/components/ProductImageCarousel";
import { useTheme } from "@/contexts/ThemeContext";
import { ParentNotificationBell } from "@/components/NotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { getDateLocale } from "@/i18n/config";

const categoryIcons: Record<string, any> = {
  Smartphone, Gamepad2, BookOpen, Dumbbell, Shirt, Book, Palette, Gift, Package
};

interface Product {
  id: string;
  name: string;
  nameAr?: string;
  nameI18n?: Record<string, string>;
  description?: string;
  descriptionAr?: string;
  descriptionI18n?: Record<string, string>;
  price: string;
  originalPrice?: string;
  pointsPrice: number;
  image?: string;
  images?: string[];
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
  parentId: string | null;
  name: string;
  nameAr: string;
  namePt: string | null;
  targetAudience?: "all" | "parents" | "children" | "fathers" | "mothers";
  icon: string;
  color: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const DEMO_PRODUCTS: Product[] = [
  {
    id: "demo-product-1",
    name: "Smart Learning Tablet",
    nameAr: "تابلت التعلم الذكي",
    description: "Tablet with parental controls and educational apps",
    price: "129.99",
    originalPrice: "159.99",
    pointsPrice: 1200,
    image: "/demo-products/learning-tablet-1.svg",
    images: [
      "/demo-products/learning-tablet-1.svg",
      "/demo-products/learning-tablet-2.svg",
    ],
    stock: 12,
    brand: "Classify Kids",
    rating: "4.8",
    reviewCount: 31,
    isFeatured: true,
    discountPercent: 19,
  },
  {
    id: "demo-product-2",
    name: "Creative STEM Box",
    nameAr: "صندوق STEM الإبداعي",
    description: "Hands-on STEM kit for building and problem solving",
    price: "59.99",
    originalPrice: "79.99",
    pointsPrice: 700,
    image: "/demo-products/stem-box-1.svg",
    images: [
      "/demo-products/stem-box-1.svg",
      "/demo-products/stem-box-2.svg",
    ],
    stock: 20,
    brand: "Classify Lab",
    rating: "4.7",
    reviewCount: 24,
    isFeatured: true,
    discountPercent: 25,
  },
];


const normalizeCartProduct = (raw: any): Product => {
  return {
    ...raw,
    name: raw?.name || raw?.nameAr || raw?.title || "Product",
    nameAr: raw?.nameAr || raw?.name || raw?.title || "منتج",
    nameI18n: raw?.nameI18n || undefined,
    description: raw?.description || raw?.descriptionAr || undefined,
    descriptionAr: raw?.descriptionAr || raw?.description || undefined,
    descriptionI18n: raw?.descriptionI18n || undefined,
    image: raw?.image || raw?.imageUrl || undefined,
    stock: typeof raw?.stock === "number" ? raw.stock : 999,
    pointsPrice: typeof raw?.pointsPrice === "number" ? raw.pointsPrice : 0,
    price: String(raw?.price ?? "0"),
  };
};

const CART_STORAGE_KEY = "parent-store-cart";

export const ParentStore = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { isDark } = useTheme();
  const token = localStorage.getItem("token");
  const isGuest = !token;
  
  // Read view param from URL
  const urlParams = new URLSearchParams(window.location.search);
  const initialView = urlParams.get("view") as "cart" | "orders" | "inventory" | null;

  const [cartDialogSection, setCartDialogSection] = useState<"cart" | "orders" | "inventory">(initialView || "cart");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [sortBy, setSortBy] = useState("featured");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(initialView === "cart" || initialView === "orders" || initialView === "inventory");
  const [showCheckout, setShowCheckout] = useState(false);
  const [showMobileHeaderMenu, setShowMobileHeaderMenu] = useState(false);
  const [buyNowProduct, setBuyNowProduct] = useState<Product | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedChild, setSelectedChild] = useState("");
  const [requiredPoints, setRequiredPoints] = useState("");
  const [shippingAddress, setShippingAddress] = useState({
    name: "", line1: "", city: "", state: "", postalCode: "", country: "EG"
  });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");

  const getAuthHeaders = (): Record<string, string> => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  const redirectToRequiredRegistration = () => {
    const redirect = encodeURIComponent("/parent-store?view=cart");
    navigate(`/parent-auth?mode=register&redirect=${redirect}`);
  };

  const { data: categoriesData } = useQuery({
    queryKey: ["store-categories"],
    queryFn: async () => {
      const res = await fetch("/api/store/categories", {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      return json?.data || json || [];
    },
    enabled: true,
  });

  const { data: productsData, isLoading: loadingProducts } = useQuery({
    queryKey: ["store-products", searchQuery, sortBy, i18n.language],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      params.append("sort", sortBy);
      params.append("lang", i18n.language);
      const res = await fetch(`/api/store/products?${params}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      return json?.data || json || [];
    },
    enabled: true,
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
    queryKey: ["/api/store/payment-methods", isGuest],
    queryFn: async () => {
      const endpoint = token ? "/api/store/payment-methods" : "/api/public/payment-methods";
      const res = await fetch(endpoint, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      return json?.data || json || [];
    },
    enabled: true,
  });

  const { data: shippingProvidersData } = useQuery({
    queryKey: ["store-shipping-providers"],
    queryFn: async () => {
      const res = await fetch("/api/store/shipping-providers");
      const json = await res.json();
      return json?.data || [];
    },
    enabled: true,
  });

  const { data: walletData, isLoading: loadingWallet } = useQuery({
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
    onSuccess: (_data, variables: any) => {
      if (!variables?.isBuyNow) {
        setCart([]);
      }
      setShowCheckout(false);
      setBuyNowProduct(null);
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

  const categories: Category[] = useMemo(() => {
    return (categoriesData?.data || categoriesData || []) as Category[];
  }, [categoriesData]);
  const mainCategories = useMemo(() => categories.filter(c => !c.parentId), [categories]);
  const subCategories = useMemo(() => categories.filter(c => !!c.parentId), [categories]);
  const categoryOptions = useMemo(() => [...mainCategories, ...subCategories], [mainCategories, subCategories]);
  const apiProducts: Product[] = productsData?.data || productsData || [];
  const products: Product[] = useMemo(() => {
    const ids = new Set(apiProducts.map((p) => p.id));
    const missingDemoProducts = DEMO_PRODUCTS.filter((p) => !ids.has(p.id));
    return [...missingDemoProducts, ...apiProducts];
  }, [apiProducts]);
  const children = childrenData || [];
  const paymentMethods = (paymentMethodsData as any)?.data || paymentMethodsData || [];
  const shippingProviders = (shippingProvidersData as any)?.data || shippingProvidersData || [];
  const suggestedShippingProvider = useMemo(
    () => shippingProviders.find((provider: any) => provider?.recommended),
    [shippingProviders]
  );
  const wallet = walletData?.data || walletData;
  const referralCode = new URLSearchParams(window.location.search).get("ref");
  const ordersList: any[] = Array.isArray(ordersData) ? ordersData : (ordersData as any)?.data || [];
  const inventoryList: any[] = Array.isArray(ownedProductsData) ? ownedProductsData : (ownedProductsData as any)?.data || [];
  const ordersCompletedCount = ordersList.filter((o: any) => o.status === "completed" || o.status === "delivered").length;
  const ordersPendingCount = ordersList.filter((o: any) => o.status === "pending" || o.status === "processing" || o.status === "shipped").length;
  const ordersCancelledCount = ordersList.filter((o: any) => o.status === "cancelled").length;

  const featuredProducts = useMemo(() => 
    products.filter((p: Product) => p.isFeatured).slice(0, 6), [products]
  );

  const filteredProducts = useMemo(() => {
    if (selectedCategories.length === 0) return products;

    const selectedSet = new Set(selectedCategories);
    return products.filter((p) => {
      if (!p.categoryId) return false;
      if (selectedSet.has(p.categoryId)) return true;

      const parent = categories.find((c) => c.id === p.categoryId)?.parentId;
      return !!parent && selectedSet.has(parent);
    });
  }, [products, selectedCategories, categories]);

  const cartItemsCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const cartTotal = useMemo(() => 
    cart.reduce((sum, item) => sum + parseFloat(item.product.price) * item.quantity, 0), [cart]
  );

  const checkoutItems = useMemo(() => {
    if (buyNowProduct) {
      return [{ product: buyNowProduct, quantity: 1 }];
    }
    return cart;
  }, [buyNowProduct, cart]);

  const checkoutTotal = useMemo(
    () => checkoutItems.reduce((sum, item) => sum + parseFloat(item.product.price) * item.quantity, 0),
    [checkoutItems]
  );

  useEffect(() => {
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (!storedCart) return;
      const parsed = JSON.parse(storedCart);
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .filter((item: any) => item?.product)
          .map((item: any) => ({
            product: normalizeCartProduct(item.product),
            quantity: Math.max(1, Number(item.quantity || 1)),
          }));
        setCart(normalized);
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

  const handleBuyNow = (product: Product) => {
    if (!token) {
      redirectToRequiredRegistration();
      return;
    }
    setBuyNowProduct(product);
    setShowCheckout(true);
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
    if (!token) {
      redirectToRequiredRegistration();
      return;
    }
    checkoutMutation.mutate({
      items: checkoutItems.map(item => ({ productId: item.product.id, quantity: item.quantity })),
      paymentMethodId: selectedPaymentMethod,
      shippingAddress,
      totalAmount: checkoutTotal,
      referralCode,
      isBuyNow: !!buyNowProduct,
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

  useEffect(() => {
    if (!showMobileHeaderMenu) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowMobileHeaderMenu(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showMobileHeaderMenu]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        setShowMobileHeaderMenu(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const getCategoryIcon = (iconName: string) => {
    const IconComponent = categoryIcons[iconName] || Package;
    return IconComponent;
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  };

  const availableCategoryOptions = useMemo(
    () => categoryOptions.filter((cat) => !selectedCategories.includes(cat.id)),
    [categoryOptions, selectedCategories]
  );

  const getCategoryLabel = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return "";
    return i18n.language === "ar" ? cat.nameAr : i18n.language === "pt" && cat.namePt ? cat.namePt : cat.name;
  };

  const getDiscountBadgeText = (product: Product) => {
    if (product.discountPercent && product.discountPercent > 0) {
      return `-${product.discountPercent}%`;
    }

    if (product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price)) {
      return `-${Math.round((1 - parseFloat(product.price) / parseFloat(product.originalPrice)) * 100)}%`;
    }

    return null;
  };

  const normalizeLocale = (lang: string) => (lang || "en").toLowerCase().split("-")[0];

  const getLocalizedName = (product: Product) => {
    const lang = normalizeLocale(i18n.language);
    const fromMap = product.nameI18n?.[lang];
    if (fromMap) return fromMap;
    if (lang === "ar" && product.nameAr) return product.nameAr;
    return product.name || product.nameAr || "";
  };

  const getLocalizedDescription = (product: Product) => {
    const lang = normalizeLocale(i18n.language);
    const fromMap = product.descriptionI18n?.[lang];
    if (fromMap) return fromMap;
    if (lang === "ar" && product.descriptionAr) return product.descriptionAr;
    return product.description || product.descriptionAr || "";
  };

  const getOrderStatusTone = (status?: string) => {
    if (status === "completed" || status === "delivered") {
      return {
        badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
        card: "border-emerald-200 dark:border-emerald-900/40",
      };
    }
    if (status === "cancelled") {
      return {
        badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
        card: "border-rose-200 dark:border-rose-900/40",
      };
    }
    return {
      badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
      card: "border-amber-200 dark:border-amber-900/40",
    };
  };

  const extractInventoryProduct = (inventoryItem: any): Product | null => {
    const raw = inventoryItem?.product || inventoryItem;
    if (!raw?.id) return null;
    return normalizeCartProduct(raw);
  };

  return (
    <div className={`min-h-screen overflow-x-hidden ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <header className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 text-white sticky top-0 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between gap-2 py-3 min-w-0">
            <button 
              onClick={() => window.history.length > 1 ? window.history.back() : navigate("/parent-dashboard")}
              className="flex items-center gap-1 sm:gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
              data-testid="button-back-dashboard"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <div className="flex items-center gap-1 sm:gap-2">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-sm sm:text-xl font-bold hidden sm:inline">{t("parentStore.storeTitle")}</span>
              </div>
            </button>

            <div className="flex-1 min-w-0 max-w-2xl mx-1 sm:mx-8">
              <div className="relative">
                <Input
                  type="text"
                  placeholder={t("parentStore.searchProducts")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 rounded-xl border-0 text-sm sm:text-base shadow-sm focus-visible:ring-2 focus-visible:ring-white/70 ${isDark ? "bg-gray-700 text-gray-200 placeholder-gray-400" : "bg-white text-gray-800 placeholder-gray-500"}`}
                  data-testid="input-search"
                />
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0 relative">
              <div className="text-right hidden md:block">
                <p className="text-xs opacity-80">{t("parentStore.walletBalance")}</p>
                {loadingWallet ? (
                  <div className="h-5 w-20 rounded bg-white/25 animate-pulse mt-1" />
                ) : (
                  <p className="font-bold">{wallet?.balance || 0} {t("parentStore.currency")}</p>
                )}
              </div>
              
              <div className="hidden md:block">
                <LanguageSelector />
              </div>
              
              <ParentNotificationBell />
              
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

              <button
                type="button"
                aria-label={t("common.more", "المزيد")}
                aria-haspopup="menu"
                aria-expanded={showMobileHeaderMenu}
                aria-controls="parent-store-mobile-header-menu"
                onClick={() => setShowMobileHeaderMenu((prev) => !prev)}
                className="md:hidden p-2 rounded-lg border border-white/20 hover:bg-white/10 transition-colors"
                data-testid="button-store-mobile-header-menu"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              <button
                aria-label={t("common.close", "إغلاق")}
                aria-hidden={!showMobileHeaderMenu}
                className={`md:hidden fixed inset-0 z-40 bg-black/25 transition-opacity duration-200 ${showMobileHeaderMenu ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                onClick={() => setShowMobileHeaderMenu(false)}
              />

              <div
                id="parent-store-mobile-header-menu"
                role="menu"
                aria-hidden={!showMobileHeaderMenu}
                className={`md:hidden absolute top-full mt-2 ${isRTL ? "left-0" : "right-0"} z-50 w-[min(14rem,calc(100vw-0.75rem))] rounded-2xl border border-white/20 shadow-2xl p-2 backdrop-blur-sm ${isRTL ? "origin-top-left" : "origin-top-right"} transition-all duration-200 ${
                  isDark ? "bg-gray-900/98" : "bg-white/98 text-gray-800"
                } ${showMobileHeaderMenu ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-1 pointer-events-none"}`}
              >
                <div
                  style={{ transitionDelay: showMobileHeaderMenu ? "35ms" : "0ms" }}
                  className={`px-1 pb-2 transition-all duration-200 ${showMobileHeaderMenu ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
                >
                  <LanguageSelector />
                </div>

                <div className={`h-px my-1 ${isDark ? "bg-white/10" : "bg-gray-200"}`} />

                <div
                  style={{ transitionDelay: showMobileHeaderMenu ? "70ms" : "0ms" }}
                  className={`px-3 py-2 rounded-xl text-xs transition-all duration-200 ${showMobileHeaderMenu ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"} ${isDark ? "bg-white/5 text-gray-200" : "bg-gray-50 text-gray-700"}`}
                >
                  <p className="opacity-80">{t("parentStore.walletBalance")}</p>
                  {loadingWallet ? (
                    <div className={`h-4 w-16 rounded mt-1 animate-pulse ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                  ) : (
                    <p className="font-bold text-sm">{wallet?.balance || 0} {t("parentStore.currency")}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-orange-700/50 py-2">
          <div className="max-w-7xl mx-auto px-4">
            <div className="relative">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="text-xs font-bold inline-flex items-center gap-1.5 opacity-95">
                  <Filter className="w-3.5 h-3.5" />
                  {t("parentStore.categoryFilterLabel", "تصفية الأقسام")}
                </div>
                <button
                  onClick={() => setShowCategoryPicker((prev) => !prev)}
                  className="w-7 h-7 inline-flex items-center justify-center rounded-full border border-white/40 bg-white/15 hover:bg-white/25 transition-colors"
                  data-testid="button-toggle-category-picker"
                  aria-label={t("parentStore.openCategories", "فتح قائمة الأقسام")}
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryPicker ? "rotate-180" : ""}`} />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-2 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => {
                    setSelectedCategories([]);
                    setShowCategoryPicker(false);
                  }}
                  className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 whitespace-nowrap"
                  data-testid="button-category-all"
                >
                  {t("parentStore.allCategories")}
                </button>
                <button
                  onClick={() => navigate("/library-store")}
                  className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap inline-flex items-center gap-1.5"
                  data-testid="button-library-store"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {t("parentStore.libraries")}
                </button>
              </div>

              {showCategoryPicker && (
                <>
                  <button
                    className="fixed inset-0 z-40"
                    onClick={() => setShowCategoryPicker(false)}
                    aria-label={t("common.close", "إغلاق")}
                  />
                  <div className={`absolute top-full mt-2 ${isRTL ? "left-0" : "right-0"} z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border shadow-2xl p-3 backdrop-blur-sm ${isDark ? "bg-gray-900/95 border-white/15" : "bg-white/95 border-gray-200"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold">{t("parentStore.categoryPickerTitle", "اختر الأقسام")}</p>
                      <button
                        onClick={() => {
                          setSelectedCategories([]);
                          setShowCategoryPicker(false);
                        }}
                        className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500 text-white hover:bg-orange-600"
                        data-testid="button-category-all"
                      >
                        {t("parentStore.allCategories")}
                      </button>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                      {availableCategoryOptions.length === 0 ? (
                        <div className={`text-center text-xs py-5 rounded-xl ${isDark ? "bg-gray-800 text-gray-300" : "bg-gray-50 text-gray-600"}`}>
                          {t("parentStore.noCategoriesLeft", "تم اختيار كل الأقسام")}
                        </div>
                      ) : (
                        availableCategoryOptions.map((cat: Category) => {
                          const Icon = getCategoryIcon(cat.icon);
                          return (
                            <button
                              key={`picker-${cat.id}`}
                              onClick={() => toggleCategory(cat.id)}
                              className={`w-full px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors text-start ${isDark ? "hover:bg-gray-800" : "hover:bg-orange-50"}`}
                              data-testid={`button-category-${cat.id}`}
                            >
                              <Icon className="w-4 h-4" />
                              <span>{getCategoryLabel(cat.id)}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="mt-1 text-[11px] opacity-85">
                {selectedCategories.length > 0
                  ? `${selectedCategories.length} ${t("parentStore.selectedCount", "محدد")}`
                  : t("parentStore.allCategories")}
              </div>
            </div>
          </div>
        </div>
      </header>

      <>
      <div className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-b"} shadow-sm py-2`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className={`flex items-center justify-between gap-2 sm:gap-4 text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            <div className="hidden sm:flex items-center gap-4 md:gap-6">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-green-500" />
                <span>{t("parentStore.fastDelivery")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <span>{t("parentStore.qualityGuarantee")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span>{t("parentStore.support247")}</span>
              </div>
            </div>
            <div className="sm:hidden grid grid-cols-2 gap-1.5 w-full">
              <span className={`px-2.5 py-1.5 rounded-xl whitespace-nowrap inline-flex items-center justify-center gap-1.5 text-[11px] font-medium border ${isRTL ? "flex-row-reverse" : ""} ${isDark ? "bg-gray-700/80 text-gray-200 border-gray-600" : "bg-gray-100 text-gray-700 border-gray-200"}`}>
                <Truck className="w-3.5 h-3.5 text-green-500" />
                {t("parentStore.fastDelivery")}
              </span>
              <span className={`px-2.5 py-1.5 rounded-xl whitespace-nowrap inline-flex items-center justify-center gap-1.5 text-[11px] font-medium border ${isRTL ? "flex-row-reverse" : ""} ${isDark ? "bg-gray-700/80 text-gray-200 border-gray-600" : "bg-gray-100 text-gray-700 border-gray-200"}`}>
                <Shield className="w-3.5 h-3.5 text-blue-500" />
                {t("parentStore.qualityGuarantee")}
              </span>
              <span className={`col-span-2 px-2.5 py-1.5 rounded-xl whitespace-nowrap inline-flex items-center justify-center gap-1.5 text-[11px] font-medium border ${isRTL ? "flex-row-reverse" : ""} ${isDark ? "bg-gray-700/80 text-gray-200 border-gray-600" : "bg-gray-100 text-gray-700 border-gray-200"}`}>
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                {t("parentStore.support247")}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32 sm:w-40 h-8 text-xs" data-testid="select-sort">
                  <SelectValue placeholder={t('parentStore.sortBy')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">{t("parentStore.sortFeatured")}</SelectItem>
                  <SelectItem value="price_asc">{t("parentStore.sortPriceAsc")}</SelectItem>
                  <SelectItem value="price_desc">{t("parentStore.sortPriceDesc")}</SelectItem>
                  <SelectItem value="newest">{t("parentStore.sortNewest")}</SelectItem>
                  <SelectItem value="rating">{t("parentStore.sortRating")}</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1 rounded transition-colors ${viewMode === "grid" ? "bg-orange-500 text-white" : isDark ? "text-gray-300 hover:bg-gray-700" : "hover:bg-gray-100"}`}
                  data-testid="button-view-grid"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1 rounded transition-colors ${viewMode === "list" ? "bg-orange-500 text-white" : isDark ? "text-gray-300 hover:bg-gray-700" : "hover:bg-gray-100"}`}
                  data-testid="button-view-list"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {selectedCategories.length === 0 && !searchQuery && featuredProducts.length > 0 && viewMode === "grid" && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                <Sparkles className="w-5 h-5 text-orange-500" />
                {t("parentStore.featuredProducts")}
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 max-[360px]:gap-1 sm:gap-4">
              {featuredProducts.map((product: Product, index: number) => (
                <Card 
                  key={product.id} 
                  className="group h-full flex flex-col cursor-pointer hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden border bg-white dark:bg-gray-800 dark:border-gray-700 motion-reduce:animate-none"
                  style={{ animation: `psFadeUp .35s ease-out both`, animationDelay: `${index * 45}ms` }}
                  onClick={() => {
                    setSelectedProduct(product);
                    setShowDetail(true);
                    setRequiredPoints(product.pointsPrice.toString());
                  }}
                  data-testid={`card-featured-product-${product.id}`}
                >
                  <div className={`relative aspect-[16/12] max-[360px]:aspect-[17/13] sm:aspect-square overflow-hidden ring-1 ring-black/5 ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                    {(product.images && product.images.length > 1) ? (
                      <ProductImageCarousel
                        images={product.images}
                        mainImage={product.image}
                        alt={product.name}
                        discountBadgeText={getDiscountBadgeText(product) || undefined}
                        className="w-full h-full"
                        compact
                        hoverArrows={false}
                        autoSlide
                        autoSlideInterval={5200}
                      />
                    ) : product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className={`w-12 h-12 ${isDark ? "text-gray-500" : "text-gray-300"}`} />
                      </div>
                    )}
                    {getDiscountBadgeText(product) && (
                      <Badge className="absolute top-2 left-2 z-30 pointer-events-none bg-red-500 text-white text-xs font-bold shadow-sm">
                        {getDiscountBadgeText(product)}
                      </Badge>
                    )}
                    {product.isLibraryProduct && (
                      <Badge className="absolute bottom-2 left-2 bg-purple-500 text-white text-xs">
                        {product.libraryName || t('parentStore.library')}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-2 max-[360px]:p-1.5 sm:p-3.5 flex flex-col flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1.5 transition-all duration-200 max-md:opacity-100 md:max-h-0 md:opacity-0 md:overflow-hidden md:group-hover:max-h-10 md:group-hover:opacity-100">
                      <p className={`text-[11px] px-2 py-0.5 rounded-full ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}>{product.brand || "Classify"}</p>
                      <p className={`text-[11px] font-bold ${isDark ? "text-orange-300" : "text-orange-600"}`}>{product.pointsPrice} {t("parentStore.pointsSuffix")}</p>
                    </div>
                    <h3 className={`font-semibold text-[10px] max-[360px]:text-[9px] sm:text-sm line-clamp-1 sm:line-clamp-2 mb-1 ${isDark ? "text-gray-200" : "text-gray-800"}`}>{getLocalizedName(product)}</h3>
                    <div className="flex items-center gap-1 mb-2.5 transition-all duration-200 max-md:opacity-100 md:max-h-0 md:opacity-0 md:overflow-hidden md:group-hover:max-h-8 md:group-hover:opacity-100">
                      {renderStars(product.rating)}
                      <span className="text-xs text-gray-400">({product.reviewCount || 0})</span>
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-1.5 max-[360px]:gap-1 pt-1 sm:pt-2">
                      <div>
                        <p className={`font-bold text-[11px] max-[360px]:text-[10px] sm:text-base ${isDark ? "text-orange-400" : "text-orange-600"}`}>{product.price} {t("parentStore.currency")}</p>
                        {product.originalPrice && (
                          <p className="text-xs text-gray-400 line-through">{product.originalPrice} {t("parentStore.currency")}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 max-[360px]:gap-0.5">
                        <Button 
                          size="sm" 
                          className="bg-orange-500 hover:bg-orange-600 h-7 w-7 max-[360px]:h-6.5 max-[360px]:w-6.5 sm:h-8 sm:w-8 p-0 rounded-lg shadow-sm active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-orange-300"
                          onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                          data-testid={`button-add-cart-${product.id}`}
                        >
                          <Plus className="w-3.5 h-3.5 max-[360px]:w-3 max-[360px]:h-3" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 h-7 max-[360px]:h-6.5 sm:h-8 px-1.5 max-[360px]:px-1 text-[10px] sm:text-xs rounded-lg shadow-sm active:scale-[0.98] transition-transform focus-visible:ring-2 focus-visible:ring-emerald-300"
                          onClick={(e) => { e.stopPropagation(); handleBuyNow(product); }}
                          data-testid={`button-buy-now-${product.id}`}
                        >
                          {t("parentStore.buyNow")}
                        </Button>
                      </div>
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
              {selectedCategories.length > 0
                ? t("parentStore.filteredByCategories", "تمت التصفية حسب الأقسام")
                : searchQuery ? `${t('parentStore.searchResults')}: "${searchQuery}"` : t('parentStore.allProducts')
              }
            </h2>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{filteredProducts.length} {t("parentStore.productCount")}</p>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <Card key={i} className={`animate-pulse border-0 ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <div className={`aspect-square ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                  <CardContent className="p-3 space-y-2">
                    <div className={`h-4 rounded w-1/2 ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                    <div className={`h-4 rounded ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                    <div className={`h-4 rounded w-3/4 ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className={`text-center py-16 rounded-2xl border ${isDark ? "border-gray-700 bg-gray-800/70" : "border-gray-200 bg-white"}`}>
              <Package className={`w-16 h-16 mx-auto mb-4 ${isDark ? "text-gray-600" : "text-gray-300"}`} />
              <h3 className={`text-lg font-medium mb-2 ${isDark ? "text-gray-200" : "text-gray-600"}`}>{t("parentStore.noProducts")}</h3>
              <p className={isDark ? "text-gray-400" : "text-gray-400"}>{t("parentStore.tryDifferentSearch")}</p>
            </div>
          ) : (
            <div className={viewMode === "grid" 
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 max-[360px]:gap-1.5 sm:gap-4"
              : "space-y-4"
            }>
              {filteredProducts.map((product: Product, index: number) => (
                viewMode === "grid" ? (
                  <Card 
                    key={product.id} 
                    className={`group h-full flex flex-col cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden border motion-reduce:animate-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}
                    style={{ animation: `psFadeUp .38s ease-out both`, animationDelay: `${(index % 10) * 40}ms` }}
                    data-testid={`card-product-${product.id}`}
                  >
                    <div 
                      className={`relative aspect-[16/12] max-[360px]:aspect-[17/13] sm:aspect-square overflow-hidden ring-1 ring-black/5 ${isDark ? "bg-gray-700" : "bg-gray-100"}`}
                      onClick={() => {
                        setSelectedProduct(product);
                        setShowDetail(true);
                        setRequiredPoints(product.pointsPrice.toString());
                      }}
                    >
                      {(product.images && product.images.length > 1) ? (
                        <ProductImageCarousel
                          images={product.images}
                          mainImage={product.image}
                          alt={product.name}
                          discountBadgeText={getDiscountBadgeText(product) || undefined}
                          className="w-full h-full"
                          compact
                          hoverArrows={false}
                          autoSlide
                          autoSlideInterval={5200}
                        />
                      ) : product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                      {getDiscountBadgeText(product) && (
                        <Badge className="absolute top-2 left-2 z-30 pointer-events-none bg-red-500 text-white text-xs font-bold shadow-sm">
                          {getDiscountBadgeText(product)}
                        </Badge>
                      )}
                      {product.isLibraryProduct && (
                        <Badge className="absolute bottom-2 left-2 bg-purple-500 text-white text-xs">
                          {product.libraryName || t('parentStore.library')}
                        </Badge>
                      )}
                      <button 
                        className="absolute top-2 right-2 p-1.5 bg-white/85 dark:bg-gray-700/85 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Heart className="w-4 h-4 text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                    <CardContent className="p-2 max-[360px]:p-1.5 sm:p-3.5 flex flex-col flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1.5 transition-all duration-200 max-md:opacity-100 md:max-h-0 md:opacity-0 md:overflow-hidden md:group-hover:max-h-10 md:group-hover:opacity-100">
                        <p className={`text-[11px] px-2 py-0.5 rounded-full ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}>{product.brand || "Classify"}</p>
                        {product.stock > 0 ? (
                          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{product.stock}</p>
                        ) : (
                          <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">0</p>
                        )}
                      </div>
                      <h3 className={`font-semibold text-[10px] max-[360px]:text-[9px] sm:text-sm line-clamp-1 sm:line-clamp-2 mb-1 min-h-[1rem] sm:min-h-[2.5rem] ${isDark ? "text-gray-200" : "text-gray-800"}`}>{getLocalizedName(product)}</h3>
                      <div className="flex items-center gap-1 mb-2.5 transition-all duration-200 max-md:opacity-100 md:max-h-0 md:opacity-0 md:overflow-hidden md:group-hover:max-h-8 md:group-hover:opacity-100">
                        {renderStars(product.rating)}
                        <span className="text-xs text-gray-400">({product.reviewCount || 0})</span>
                      </div>
                      <div className="mt-auto flex flex-col gap-1 max-[360px]:gap-0.5 sm:gap-2 pt-1 sm:pt-2">
                        <div className="flex items-center justify-between">
                          <p className={`font-bold text-[11px] max-[360px]:text-[10px] sm:text-lg ${isDark ? "text-orange-400" : "text-orange-600"}`}>{product.price} {t("parentStore.currency")}</p>
                          {product.originalPrice && (
                            <p className="text-xs text-gray-400 line-through">{product.originalPrice} {t("parentStore.currency")}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 max-[360px]:gap-0.5">
                          <Button 
                            size="sm" 
                            className="bg-orange-500 hover:bg-orange-600 flex-1 text-[10px] max-[360px]:text-[9px] sm:text-sm h-7 max-[360px]:h-6.5 sm:h-9 px-1 max-[360px]:px-0.5 sm:px-3 rounded-lg shadow-sm active:scale-[0.98] transition-transform focus-visible:ring-2 focus-visible:ring-orange-300"
                            onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                            data-testid={`button-add-cart-${product.id}`}
                          >
                            <ShoppingCart className="w-3 h-3 max-[360px]:w-2.5 max-[360px]:h-2.5 sm:w-4 sm:h-4 ml-1 max-[360px]:ml-0.5" />
                            {t("parentStore.addToCart")}
                          </Button>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 flex-1 text-[10px] max-[360px]:text-[9px] sm:text-sm h-7 max-[360px]:h-6.5 sm:h-9 px-1 max-[360px]:px-0.5 sm:px-3 rounded-lg shadow-sm active:scale-[0.98] transition-transform focus-visible:ring-2 focus-visible:ring-emerald-300"
                            onClick={(e) => { e.stopPropagation(); handleBuyNow(product); }}
                            data-testid={`button-buy-now-${product.id}`}
                          >
                            {t("parentStore.buy")}
                          </Button>
                        </div>
                      </div>
                      <div className={`mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t ${isDark ? "border-gray-700" : ""}`}>
                        <p className={`text-xs flex items-center gap-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          <Star className="w-3 h-3 text-yellow-500" />
                          {t("parentStore.needsPoints")} <span className="font-bold text-orange-600">{product.pointsPrice}</span> {t("parentStore.pointsSuffix")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card 
                    key={product.id} 
                    className={`group flex flex-col sm:flex-row overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer motion-reduce:animate-none ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                    style={{ animation: `psFadeUp .34s ease-out both`, animationDelay: `${(index % 8) * 35}ms` }}
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowDetail(true);
                      setRequiredPoints(product.pointsPrice.toString());
                    }}
                    data-testid={`card-product-list-${product.id}`}
                  >
                    <div className={`relative w-full h-28 max-[320px]:h-22 sm:w-40 sm:h-40 flex-shrink-0 ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                      {(product.images && product.images.length > 1) ? (
                        <ProductImageCarousel
                          images={product.images}
                          mainImage={product.image}
                          alt={product.name}
                          discountBadgeText={getDiscountBadgeText(product) || undefined}
                          className="w-full h-full"
                          compact
                          hoverArrows={false}
                          autoSlide
                          autoSlideInterval={5200}
                        />
                      ) : product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-gray-300" />
                        </div>
                      )}
                      {getDiscountBadgeText(product) && (
                        <Badge className="absolute top-2 left-2 z-30 pointer-events-none bg-red-500 text-white text-xs font-bold shadow-sm">
                          {getDiscountBadgeText(product)}
                        </Badge>
                      )}
                      {product.isLibraryProduct && (
                        <Badge className="absolute bottom-2 left-2 bg-purple-500 text-white text-xs">
                          {product.libraryName || t('parentStore.library')}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="flex-1 p-2.5 max-[320px]:p-2 sm:p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1.5 max-[320px]:gap-1 mb-1 max-[320px]:mb-0.5">
                          <p className={`text-[11px] max-[320px]:text-[10px] px-1.5 max-[320px]:px-1 py-0.5 rounded-full ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}>{product.brand || "Classify"}</p>
                          <p className={`text-[11px] max-[320px]:text-[10px] font-bold ${isDark ? "text-orange-300" : "text-orange-600"}`}>{product.pointsPrice} {t("parentStore.pointsSuffix")}</p>
                        </div>
                        <h3 className={`font-semibold text-[13px] max-[320px]:text-xs mb-1.5 max-[320px]:mb-1 ${isDark ? "text-gray-200" : "text-gray-800"}`}>{getLocalizedName(product)}</h3>
                        <p className={`text-xs max-[320px]:text-[10px] line-clamp-2 max-[320px]:line-clamp-1 transition-all duration-200 max-md:opacity-100 md:max-h-14 md:opacity-0 md:overflow-hidden md:group-hover:max-h-14 md:group-hover:opacity-100 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{getLocalizedDescription(product)}</p>
                        <div className="flex items-center gap-1.5 max-[320px]:gap-1 mt-1.5 max-[320px]:mt-1 transition-all duration-200 max-md:opacity-100 md:max-h-8 md:opacity-0 md:overflow-hidden md:group-hover:max-h-8 md:group-hover:opacity-100">
                          {renderStars(product.rating)}
                          <span className="text-[11px] max-[320px]:text-[10px] text-gray-400">({product.reviewCount || 0} {t("parentStore.reviews")})</span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-2 max-[320px]:mt-1.5 gap-1.5 max-[320px]:gap-1">
                        <div>
                          <p className={`text-lg max-[320px]:text-base font-bold ${isDark ? "text-orange-400" : "text-orange-600"}`}>{product.price} {t("parentStore.currency")}</p>
                          <p className={`text-[11px] max-[320px]:text-[10px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("parentStore.requiredPointsLabel")} {product.pointsPrice}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 max-[320px]:gap-1 sm:flex sm:items-center sm:gap-2">
                          <Button 
                            className="bg-orange-500 hover:bg-orange-600 rounded-lg shadow-sm active:scale-[0.98] transition-transform focus-visible:ring-2 focus-visible:ring-orange-300 text-[11px] max-[320px]:text-[9px] sm:text-sm h-8 max-[320px]:h-7 px-2 max-[320px]:px-1"
                            onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                            data-testid={`button-add-cart-list-${product.id}`}
                            aria-label={t("parentStore.addToCartFull")}
                          >
                            <ShoppingCart className="w-3.5 h-3.5 max-[320px]:w-2.5 max-[320px]:h-2.5 ml-1.5 max-[320px]:ml-0.5" />
                            <span className="max-[320px]:hidden">{t("parentStore.addToCartFull")}</span>
                          </Button>
                          <Button
                            className="bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm active:scale-[0.98] transition-transform focus-visible:ring-2 focus-visible:ring-emerald-300 text-[11px] max-[320px]:text-[9px] sm:text-sm h-8 max-[320px]:h-7 px-2 max-[320px]:px-1"
                            onClick={(e) => { e.stopPropagation(); handleBuyNow(product); }}
                            data-testid={`button-buy-now-list-${product.id}`}
                            aria-label={t("parentStore.buyNow")}
                          >
                            <Check className="hidden max-[320px]:inline-block w-3 h-3" />
                            <span className="max-[320px]:hidden">{t("parentStore.buyNow")}</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              ))}
            </div>
          )}
        </section>
      </main>

      {cartItemsCount > 0 && (
        <div className="sm:hidden fixed bottom-3 left-3 right-3 z-40">
          <div className={`rounded-2xl border shadow-xl px-3 py-2.5 backdrop-blur-sm ${isDark ? "bg-gray-900/95 border-gray-700" : "bg-white/95 border-gray-200"}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("parentStore.cartTab")}</p>
                <p className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                  {cartItemsCount} • {cartTotal.toFixed(2)} {t("parentStore.currency")}
                </p>
              </div>
              <Button
                className="h-9 rounded-xl bg-orange-500 hover:bg-orange-600 px-4"
                onClick={() => {
                  setCartDialogSection("cart");
                  setShowCart(true);
                }}
                data-testid="button-mobile-go-cart"
              >
                <ShoppingCart className="w-4 h-4 ml-1" />
                {t("parentStore.completePurchase")}
              </Button>
            </div>
          </div>
        </div>
      )}
      </>

      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className={`max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
          <DialogHeader>
            <DialogTitle className="space-y-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                {t("parentStore.cartTitle", { count: cart.length })}
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setCartDialogSection("cart")}
                  className={`px-2 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${cartDialogSection === "cart" ? "bg-orange-500 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  {t("parentStore.cartTab")}
                </button>
                <button
                  onClick={() => setCartDialogSection("orders")}
                  className={`px-2 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${cartDialogSection === "orders" ? "bg-orange-500 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {t("parentStore.myOrdersTab")}
                </button>
                <button
                  onClick={() => setCartDialogSection("inventory")}
                  className={`px-2 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${cartDialogSection === "inventory" ? "bg-orange-500 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                >
                  <Boxes className="w-3.5 h-3.5" />
                  {t("parentStore.myInventory")}
                </button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {cartDialogSection === "cart" && (cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">{t("parentStore.cartEmpty")}</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.product.id} className={`flex items-center gap-4 p-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-100"}`}>
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
                      <h4 className="font-medium text-sm truncate">{getLocalizedName(item.product)}</h4>
                      <p className="text-orange-600 font-bold">{item.product.price} {t("parentStore.currency")}</p>
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

              <div className={`border-t pt-4 mt-4 space-y-3 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                <div className="flex justify-between text-lg font-bold">
                  <span>{t("parentStore.totalLabel")}</span>
                  <span className="text-orange-600">{cartTotal.toFixed(2)} {t("parentStore.currency")}</span>
                </div>
                <Button 
                  className="w-full h-11 rounded-xl bg-orange-500 hover:bg-orange-600"
                  onClick={() => {
                    setShowCart(false);
                    setBuyNowProduct(null);
                    if (!token) {
                      redirectToRequiredRegistration();
                      return;
                    }
                    setShowCheckout(true);
                  }}
                  data-testid="button-proceed-checkout"
                >
                  <CreditCard className="w-4 h-4 ml-2" />
                  {t("parentStore.completePurchase")}
                </Button>
              </div>
            </>
          ))}

          {cartDialogSection === "orders" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className={`rounded-lg border p-2 text-center ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <p className="text-[11px] text-gray-500">{t("parentStore.myOrdersTab")}</p>
                  <p className="text-sm font-bold">{ordersList.length}</p>
                </div>
                <div className={`rounded-lg border p-2 text-center ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <p className="text-[11px] text-gray-500">{t("parentStore.statusPending")}</p>
                  <p className="text-sm font-bold text-amber-600">{ordersPendingCount}</p>
                </div>
                <div className={`rounded-lg border p-2 text-center ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <p className="text-[11px] text-gray-500">{t("parentStore.statusCompleted")}</p>
                  <p className="text-sm font-bold text-emerald-600">{ordersCompletedCount}</p>
                </div>
              </div>

              {loadingOrders ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={`dialog-orders-skeleton-${idx}`} className={`rounded-xl border p-3 animate-pulse ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                      <div className={`h-3 w-32 rounded mb-2 ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                      <div className={`h-3 w-24 rounded ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                    </div>
                  ))}
                </div>
              ) : ordersList.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">{t("parentStore.noOrdersYet")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ordersList.slice(0, 8).map((order: any) => (
                    <Card key={`dialog-order-${order.id}`} className={`overflow-hidden border ${getOrderStatusTone(order.status).card} ${isDark ? "bg-gray-800" : "bg-white"}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold">{t("parentStore.orderNumber")}{order.id?.slice(0, 8)}</p>
                            <p className="text-xs text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString(getDateLocale()) : ""}</p>
                          </div>
                          <div className="text-left">
                            <Badge className={getOrderStatusTone(order.status).badge}>
                              {order.status === "completed" || order.status === "delivered" ? t('parentStore.statusCompleted') :
                               order.status === "pending" ? t('parentStore.statusPending') :
                               order.status === "processing" ? t('parentStore.statusProcessing') :
                               order.status === "shipped" ? t('parentStore.statusShipped') :
                               order.status === "cancelled" ? t('parentStore.statusCancelled') : order.status}
                            </Badge>
                            <p className="text-sm font-bold text-orange-600 mt-1">{order.totalAmount} {t("parentStore.currency")}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {cartDialogSection === "inventory" && (
            <div className="space-y-3">
              <div className="rounded-lg border p-3 text-sm flex items-center justify-between bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                <span>{t("parentStore.myInventory")}</span>
                <span className="font-bold">{inventoryList.length}</span>
              </div>

              {inventoryList.length === 0 ? (
                <div className="text-center py-8">
                  <Boxes className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">{t("parentStore.noProducts")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {inventoryList.slice(0, 12).map((item: any, idx: number) => {
                    const inventoryProduct = extractInventoryProduct(item);
                    const title = item?.product?.nameAr || item?.product?.name || item?.title || item?.name || t("parentStore.product", "منتج");
                    const image = item?.product?.image || item?.product?.imageUrl || item?.image || "";
                    const points = item?.requiredPoints ?? item?.points ?? item?.product?.pointsPrice ?? 0;
                    return (
                      <Card key={`dialog-inventory-${item.id || idx}`} className={`border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                        <CardContent className="p-3 space-y-2.5">
                          <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                            {image ? <img src={image} alt={title} className="w-full h-full object-cover" /> : <Package className="w-5 h-5 m-3.5 text-gray-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{title}</p>
                            <p className="text-xs text-gray-500">{points} {t("parentStore.pointsSuffix")}</p>
                          </div>
                          </div>
                          {inventoryProduct && (
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                variant="outline"
                                className="h-8 rounded-lg text-xs"
                                onClick={() => {
                                  setSelectedProduct(inventoryProduct);
                                  setRequiredPoints(String(inventoryProduct.pointsPrice || 0));
                                  setShowCart(false);
                                  setShowDetail(true);
                                }}
                              >
                                {t("productDetail.title")}
                              </Button>
                              <Button
                                className="h-8 rounded-lg text-xs bg-orange-500 hover:bg-orange-600"
                                onClick={() => {
                                  if (!token) {
                                    setShowCart(false);
                                    redirectToRequiredRegistration();
                                    return;
                                  }
                                  setSelectedProduct(inventoryProduct);
                                  setRequiredPoints(String(inventoryProduct.pointsPrice || 0));
                                  setShowCart(false);
                                  setShowAssign(true);
                                }}
                              >
                                <Gift className="w-3.5 h-3.5 ml-1" />
                                {t("productDetail.assignProductAsGift")}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCheckout}
        onOpenChange={(open) => {
          setShowCheckout(open);
          if (!open) {
            setBuyNowProduct(null);
          }
        }}
      >
        <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {buyNowProduct ? t('parentStore.directPurchase') : t('parentStore.completePurchase')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {t("parentStore.shippingAddress")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Input
                  placeholder={t('parentStore.fullName')}
                  value={shippingAddress.name}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, name: e.target.value }))}
                  className="rounded-xl"
                  data-testid="input-shipping-name"
                />
                <Input
                  placeholder={t('parentStore.city')}
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                  className="rounded-xl"
                  data-testid="input-shipping-city"
                />
                <Input
                  placeholder={t('parentStore.detailedAddress')}
                  value={shippingAddress.line1}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, line1: e.target.value }))}
                  className="sm:col-span-2 rounded-xl"
                  data-testid="input-shipping-address"
                />
                <Input
                  placeholder={t('parentStore.areaDistrict')}
                  value={shippingAddress.state}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, state: e.target.value }))}
                  className="rounded-xl"
                />
                <Input
                  placeholder={t('parentStore.postalCode')}
                  value={shippingAddress.postalCode}
                  onChange={(e) => setShippingAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              {suggestedShippingProvider && (
                <div className={`mt-3 rounded-lg border p-3 ${suggestedShippingProvider.enabled ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/20" : "border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/20"}`}>
                  <div className="flex items-start gap-2">
                    <Truck className={`w-4 h-4 mt-0.5 ${suggestedShippingProvider.enabled ? "text-emerald-600" : "text-amber-600"}`} />
                    <div>
                      <p className="font-bold text-sm">
                        {i18n.language === "ar" ? suggestedShippingProvider.labelAr : suggestedShippingProvider.labelEn}
                      </p>
                      <p className="text-xs opacity-80">
                        {i18n.language === "ar" ? suggestedShippingProvider.descriptionAr : suggestedShippingProvider.descriptionEn}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                {t("parentStore.paymentMethod")}
              </h3>
              <div className="space-y-2">
                {paymentMethods.length === 0 ? (
                  <p className="text-gray-500 text-sm">{t("parentStore.noPaymentMethods")}</p>
                ) : (
                  paymentMethods.map((method: any) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                      className={`w-full p-3 border rounded-xl text-right flex items-center gap-3 transition-colors ${
                        selectedPaymentMethod === method.id ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPaymentMethod === method.id ? "border-orange-500" : "border-gray-300"
                      }`}>
                        {selectedPaymentMethod === method.id && (
                          <div className="w-3 h-3 bg-orange-500 rounded-full" />
                        )}
                      </div>
                      <span>{method.displayName || method.accountName || method.bankName || method.type}</span>
                    </button>
                  ))
                )}
                
                <button
                  onClick={() => setSelectedPaymentMethod("wallet")}
                  className={`w-full p-3 border rounded-xl text-right flex items-center gap-3 transition-colors ${
                    selectedPaymentMethod === "wallet" ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPaymentMethod === "wallet" ? "border-orange-500" : "border-gray-300"
                  }`}>
                    {selectedPaymentMethod === "wallet" && (
                      <div className="w-3 h-3 bg-orange-500 rounded-full" />
                    )}
                  </div>
                  <span>{t("parentStore.payFromWallet", { balance: wallet?.balance || 0 })}</span>
                </button>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
              <h3 className="font-bold mb-3">{t("parentStore.orderSummary")}</h3>
              <div className="space-y-2 text-sm">
                {checkoutItems.map(item => (
                  <div key={item.product.id} className="flex justify-between">
                    <span>{getLocalizedName(item.product)} x{item.quantity}</span>
                    <span>{(parseFloat(item.product.price) * item.quantity).toFixed(2)} {t("parentStore.currency")}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                  <span>{t("parentStore.totalLabel")}</span>
                  <span className="text-orange-600">{checkoutTotal.toFixed(2)} {t("parentStore.currency")}</span>
                </div>
              </div>
            </div>

            <Button 
              className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-base sm:text-lg"
              onClick={handleCheckout}
              disabled={checkoutMutation.isPending || !selectedPaymentMethod || !token}
              data-testid="button-confirm-checkout"
            >
              {checkoutMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t("parentStore.processing")}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  {t("parentStore.confirmPurchase")}
                </span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              {t("productDetail.title")}
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-5">
              {/* Product Images */}
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700" style={{ aspectRatio: '4/3' }}>
                {(selectedProduct.images && selectedProduct.images.length > 1) ? (
                  <ProductImageCarousel
                    images={selectedProduct.images}
                    mainImage={selectedProduct.image}
                    alt={selectedProduct.name}
                    discountBadgeText={getDiscountBadgeText(selectedProduct) || undefined}
                    className="w-full h-full"
                    autoSlide
                    autoSlideInterval={5200}
                    contain
                  />
                ) : selectedProduct.image ? (
                  <div className="relative w-full h-full">
                    <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-contain rounded-xl" />
                    {getDiscountBadgeText(selectedProduct) && (
                      <Badge className="absolute top-2 left-2 z-30 pointer-events-none bg-red-500 text-white text-xs font-bold shadow-sm">
                        {getDiscountBadgeText(selectedProduct)}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-16 h-16 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="space-y-1">
                {selectedProduct.brand && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{selectedProduct.brand}</p>
                )}
                <h3 className="font-bold text-xl text-gray-800 dark:text-white">
                  {getLocalizedName(selectedProduct)}
                </h3>
                {selectedProduct.category && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    {selectedProduct.category.nameAr || selectedProduct.category.name}
                  </Badge>
                )}
              </div>

              {/* Description */}
              {getLocalizedDescription(selectedProduct) && (
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  {getLocalizedDescription(selectedProduct)}
                </p>
              )}

              {/* Rating */}
              <div className="flex items-center gap-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(parseFloat(selectedProduct.rating || "0"))
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
                <span className="text-xs text-gray-400">({selectedProduct.reviewCount || 0} {t("productDetail.reviews")})</span>
              </div>

              {/* Price & Stock */}
              <div className={`p-4 rounded-2xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t("productDetail.price")}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{selectedProduct.price} {t("productDetail.currency")}</span>
                      {selectedProduct.originalPrice && parseFloat(selectedProduct.originalPrice) > parseFloat(selectedProduct.price) && (
                        <span className="text-sm text-gray-400 line-through">{selectedProduct.originalPrice} {t("productDetail.currency")}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t("productDetail.stock")}</p>
                    <p className={`font-bold ${selectedProduct.stock > 0 ? "text-green-600" : "text-red-600"}`}>
                      {selectedProduct.stock > 0 ? `${selectedProduct.stock} ${t("productDetail.available")}` : t("productDetail.soldOut")}
                    </p>
                  </div>
                </div>
                {selectedProduct.pointsPrice > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-xs flex items-center gap-1 text-orange-600">
                      <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                      {t("productDetail.needsPointsAsGift", { points: selectedProduct.pointsPrice })}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className={`space-y-2 pt-2 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      setBuyNowProduct(selectedProduct);
                      setShowDetail(false);
                      setShowCheckout(true);
                    }}
                    disabled={selectedProduct.stock <= 0}
                  >
                    <CreditCard className="w-4 h-4 ml-2" />
                    {t("productDetail.buyNow")}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-11 rounded-xl border-blue-200 hover:bg-blue-50 dark:border-gray-600 dark:hover:bg-gray-700"
                    onClick={() => {
                      addToCart(selectedProduct);
                      setShowDetail(false);
                    }}
                    disabled={selectedProduct.stock <= 0}
                  >
                    <ShoppingCart className="w-4 h-4 ml-2" />
                    {t("productDetail.addToCart")}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-gray-600 dark:hover:bg-gray-700"
                  onClick={() => {
                    setShowDetail(false);
                    setShowAssign(true);
                  }}
                >
                  <Gift className="w-4 h-4 ml-2" />
                  {t("productDetail.assignAsGiftToChild")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent className={`max-w-md rounded-3xl border shadow-2xl ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-orange-500" />
              {t("productDetail.assignProductAsGift")}
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-6">
              <div className={`flex items-center gap-4 p-4 rounded-xl border ${isDark ? "bg-orange-900/20 border-orange-800/60" : "bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-100"}`}>
                <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm">
                  {(selectedProduct.images && selectedProduct.images.length > 1) ? (
                    <ProductImageCarousel
                      images={selectedProduct.images}
                      mainImage={selectedProduct.image}
                      alt={selectedProduct.name}
                      discountBadgeText={getDiscountBadgeText(selectedProduct) || undefined}
                      className="w-full h-full"
                      compact
                    />
                  ) : selectedProduct.image ? (
                    <div className="relative w-full h-full">
                      <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                      {getDiscountBadgeText(selectedProduct) && (
                        <Badge className="absolute top-1.5 left-1.5 z-30 pointer-events-none bg-red-500 text-white text-[10px] font-bold shadow-sm">
                          {getDiscountBadgeText(selectedProduct)}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">{getLocalizedName(selectedProduct)}</h4>
                  <p className="text-orange-600 font-bold text-lg">{selectedProduct.price} {t("productDetail.currency")}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t("productDetail.selectChild")}</label>
                <Select value={selectedChild} onValueChange={setSelectedChild}>
                  <SelectTrigger data-testid="select-child">
                    <SelectValue placeholder={t('parentStore.selectChildPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {children.map((child: any) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.name} ({child.totalPoints || 0} {t("productDetail.point")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t("productDetail.requiredPointsForGift")}</label>
                <Input
                  type="number"
                  value={requiredPoints}
                  onChange={(e) => setRequiredPoints(e.target.value)}
                  placeholder={t('parentStore.pointsExample')}
                  className="rounded-xl"
                  data-testid="input-required-points"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t("productDetail.childNeedsToCollectPoints")}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 h-11 rounded-xl bg-orange-500 hover:bg-orange-600"
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
                  {assignProductMutation.isPending ? t('parentStore.assigningInProgress') : t('parentStore.buyAndAssign')}
                </Button>
                <Button
                  variant="outline"
                  className="h-11 rounded-xl"
                  onClick={() => { addToCart(selectedProduct); setShowAssign(false); }}
                >
                  {t("productDetail.addToCartOnly")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* Product store fade-up animation for progressive card reveal */
if (typeof document !== "undefined" && !document.getElementById("ps-fadeup-style")) {
  const style = document.createElement("style");
  style.id = "ps-fadeup-style";
  style.textContent = `
    @keyframes psFadeUp {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
}

export default ParentStore;
