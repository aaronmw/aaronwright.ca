'use client';

import { Square } from '@/components/Square';
import sample from 'lodash/sample';
import Head from 'next/head';
import { useEffect, useState } from 'react';

const colorOptions = [
  'bg-amber-500',
  'bg-lime-500',
  'bg-pink-500',
  'bg-purple-500',
  'bg-red-600',
  'bg-sky-500',
];

export default function Home() {
  const [color, setColor] = useState<string>('bg-neutral-900');

  useEffect(() => {
    const randomColor = sample(colorOptions)!;

    setColor(randomColor);
  });

  const squareProps = {
    className: color,
  };

  return (
    <div
      className="
        absolute
        left-0
        top-0
        flex
        h-screen
        w-screen
        items-center
        justify-center
        bg-black
      "
    >
      <Head>
        <title>Aaron M. Wright</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main
        className="
          flex
          cursor-pointer
          items-end
          opacity-90
          transition-all
          hover:opacity-100
        "
      >
        <div>
          <Square {...squareProps} />
          <Square {...squareProps} />
          <Square {...squareProps} />
          <Square {...squareProps} />
          <Square {...squareProps} />
        </div>
        <div>
          <Square {...squareProps} />
        </div>
        <div className="flex h-full flex-col justify-between">
          <Square {...squareProps} />
          <Square className="bg-transparent" />
          <Square {...squareProps} />
          <Square {...squareProps} />
        </div>
        <div>
          <Square {...squareProps} />
        </div>
        <div>
          <Square {...squareProps} />
          <Square {...squareProps} />
          <Square {...squareProps} />
          <Square {...squareProps} />
          <Square {...squareProps} />
        </div>
      </main>
    </div>
  );
}
