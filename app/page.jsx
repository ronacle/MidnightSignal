'use client';

import { useState } from 'react';

import TopNav from '@/components/layout/TopNav';
import HeroSection from '@/components/layout/HeroSection';

import TopSignalCard from '@/components/signals/TopSignalCard';
import TonightBrief from '@/components/signals/TonightBrief';
import SinceLastVisit from '@/components/signals/SinceLastVisit';
import Top20Grid from '@/components/signals/Top20Grid';

import ControlDrawer from '@/components/panels/ControlDrawer';
import LearningDrawer from '@/components/panels/LearningDrawer';

export default function Page() {
  const [controlOpen, setControlOpen] = useState(false);
  const [learningOpen, setLearningOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#06111f] text-white">

      <TopNav
        onOpenControls={() => setControlOpen(true)}
        onOpenLearning={() => setLearningOpen(true)}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">

        <HeroSection />

        <div className="mt-6">
          <TopSignalCard />
        </div>

        <div className="mt-6">
          <TonightBrief />
        </div>

        <div className="mt-6">
          <SinceLastVisit />
        </div>

        <div className="mt-8">
          <Top20Grid />
        </div>

      </div>

      <ControlDrawer open={controlOpen} onClose={() => setControlOpen(false)} />
      <LearningDrawer open={learningOpen} onClose={() => setLearningOpen(false)} />

    </main>
  );
}