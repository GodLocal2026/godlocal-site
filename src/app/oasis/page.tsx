'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://godlocal-api.onrender.com'
const WS_BASE  = API_BASE.replace('https://','wss://').replace('http://','ws://')

export default function OasisPage() {
  return <div>placeholder</div>
}