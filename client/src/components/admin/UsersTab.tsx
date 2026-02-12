import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface ParentData {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  walletBalance: number;
  totalDeposited: number;
  totalSpent: number;
}

export function UsersTab({ token }: { token: string }) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: parents, isLoading } = useQuery({
    queryKey: ["admin-parents"],
    queryFn: async () => {
      const res = await fetch("/api/admin/parents", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) return [];
      return (json?.data || []) as ParentData[];
    },
    enabled: !!token,
  });

  const filteredParents = parents?.filter(
    (p) =>
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) return <div className="p-4">Loading parents...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Parent Management</h2>
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-600"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Wallet Balance</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Total Deposited</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Total Spent</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filteredParents?.map((parent) => (
              <tr key={parent.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{parent.email}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{parent.name}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                    ${parent.walletBalance.toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-green-600 font-semibold">
                  ${parent.totalDeposited.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm text-red-600 font-semibold">
                  ${parent.totalSpent.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(parent.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredParents?.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            No parents found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
