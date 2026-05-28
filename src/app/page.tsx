'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckSquare, Calendar, Clock, Wallet, Users } from 'lucide-react';

const WEDDING_DATE = new Date('2026-10-10T15:00:00+05:30');

function getCountdown() {
  const now = new Date();
  const diff = WEDDING_DATE.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

function formatLKR(amount: number) {
  return 'Rs. ' + amount.toLocaleString('en-LK', { minimumFractionDigits: 2 });
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [stats, setStats] = useState({
    totalTasks: 0,
    doneTasks: 0,
    totalBudget: 0,
    totalPaid: 0,
    milestonesTotal: 0,
    milestonesDone: 0,
    totalGuests: 0,
    confirmedGuests: 0,
  });

  useEffect(() => {
    setMounted(true);
    setCountdown(getCountdown());
    const timer = setInterval(() => setCountdown(getCountdown()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchStats() {
      const [tasks, budget, guests] = await Promise.all([
        supabase.from('tasks').select('status, due_date'),
        supabase.from('budget_items').select('total_expense, advance_paid, status'),
        supabase.from('guest_items').select('count, rsvp_status'),
      ]);

      const taskData = tasks.data || [];
      const budgetData = budget.data || [];
      const guestData = guests.data || [];
      const withDueDate = taskData.filter((t) => t.due_date);

      setStats({
        totalTasks: taskData.length,
        doneTasks: taskData.filter((t) => t.status === 'done').length,
        totalBudget: budgetData.reduce((sum, b) => sum + Number(b.total_expense), 0),
        totalPaid: budgetData.reduce((sum, b) => {
          if (b.status === 'settled') return sum + Number(b.total_expense);
          return sum + Number(b.advance_paid);
        }, 0),
        milestonesTotal: withDueDate.length,
        milestonesDone: withDueDate.filter((t) => t.status === 'done').length,
        totalGuests: guestData.reduce((sum, g) => sum + Number(g.count), 0),
        confirmedGuests: guestData.filter((g) => g.rsvp_status === 'confirmed').reduce((sum, g) => sum + Number(g.count), 0),
      });
    }
    fetchStats();
  }, []);

  const taskPercent = stats.totalTasks > 0 ? Math.round((stats.doneTasks / stats.totalTasks) * 100) : 0;
  const milestonePercent = stats.milestonesTotal > 0 ? Math.round((stats.milestonesDone / stats.milestonesTotal) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <Image
          src="/logo.png"
          alt="Amaya & Shavin"
          width={160}
          height={160}
          className="mx-auto mb-4"
          style={{ mixBlendMode: 'multiply' }}
          priority
        />
        <h1 className="text-4xl sm:text-5xl font-bold text-gold mb-1">Amaya & Shavin</h1>
        <p className="text-warm-gray-light text-lg italic">Forever & Always</p>
        <p className="text-warm-gray mt-2 text-sm">
          10th October 2026 &middot; St. Sebastians Church, Moratuwa
        </p>
      </div>

      {/* Countdown */}
      <div className="card mb-8">
        <h2 className="text-center text-2xl font-semibold text-gold mb-5">Counting Down</h2>
        <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
          {[
            { value: countdown.days, label: 'Days' },
            { value: countdown.hours, label: 'Hours' },
            { value: countdown.minutes, label: 'Minutes' },
            { value: countdown.seconds, label: 'Seconds' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-gold">{mounted ? item.value : '-'}</div>
              <div className="text-xs text-warm-gray-light mt-1 uppercase tracking-wider">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Link href="/tasks" className="card hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gold/10 rounded-lg">
              <CheckSquare size={20} className="text-gold" />
            </div>
            <h3 className="text-sm font-medium text-warm-gray">Tasks</h3>
          </div>
          <p className="text-2xl font-bold text-gold">{stats.doneTasks}/{stats.totalTasks}</p>
          <div className="mt-2 h-2 bg-ivory-dark rounded-full overflow-hidden">
            <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${taskPercent}%` }} />
          </div>
          <p className="text-xs text-warm-gray-light mt-1">{taskPercent}% complete</p>
        </Link>

        <Link href="/timeline" className="card hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gold/10 rounded-lg">
              <Calendar size={20} className="text-gold" />
            </div>
            <h3 className="text-sm font-medium text-warm-gray">Timeline</h3>
          </div>
          <p className="text-2xl font-bold text-gold">{stats.milestonesDone}/{stats.milestonesTotal}</p>
          <div className="mt-2 h-2 bg-ivory-dark rounded-full overflow-hidden">
            <div className="h-full bg-sage rounded-full transition-all" style={{ width: `${milestonePercent}%` }} />
          </div>
          <p className="text-xs text-warm-gray-light mt-1">{milestonePercent}% complete</p>
        </Link>

        <Link href="/budget" className="card hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gold/10 rounded-lg">
              <Wallet size={20} className="text-gold" />
            </div>
            <h3 className="text-sm font-medium text-warm-gray">Budget Spent</h3>
          </div>
          <p className="text-2xl font-bold text-gold">{formatLKR(stats.totalPaid)}</p>
          <p className="text-xs text-warm-gray-light mt-2">of {formatLKR(stats.totalBudget)} total</p>
        </Link>

        <Link href="/schedule" className="card hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gold/10 rounded-lg">
              <Clock size={20} className="text-gold" />
            </div>
            <h3 className="text-sm font-medium text-warm-gray">Wedding Day</h3>
          </div>
          <p className="text-lg font-semibold text-gold mt-1">3:00 PM</p>
          <p className="text-xs text-warm-gray-light mt-2">St. Sebastians Church</p>
        </Link>

        <Link href="/guests" className="card hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gold/10 rounded-lg">
              <Users size={20} className="text-gold" />
            </div>
            <h3 className="text-sm font-medium text-warm-gray">Guests</h3>
          </div>
          <p className="text-2xl font-bold text-gold">{stats.totalGuests}</p>
          <div className="mt-2 h-2 bg-ivory-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gold rounded-full transition-all"
              style={{ width: stats.totalGuests > 0 ? `${Math.round((stats.confirmedGuests / stats.totalGuests) * 100)}%` : '0%' }}
            />
          </div>
          <p className="text-xs text-warm-gray-light mt-1">{stats.confirmedGuests} confirmed</p>
        </Link>
      </div>
    </div>
  );
}
