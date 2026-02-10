"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// تنظیمات اتصال به سوپابیس
const SUPABASE_URL = 'https://tpraynocoxkbjvoyjzua.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // حتما کلید خود را اینجا قرار دهید

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: items, error } = await supabase
        .from('your_table_name') // نام جدول خود را اینجا بنویسید
        .select('*');
      
      if (error) throw error;
      setData(items || []);
    } catch (error) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          اتصال به سوپابیس
        </h1>
        
        {loading ? (
          <p className="text-center text-blue-500">در حال بارگذاری...</p>
        ) : (
          <ul className="space-y-2">
            {data.map((item, index) => (
              <li key={index} className="p-3 border-b border-gray-200 text-gray-700">
                {JSON.stringify(item)}
              </li>
            ))}
            {data.length === 0 && (
              <p className="text-center text-gray-500">داده‌ای یافت نشد.</p>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}