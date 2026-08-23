'use client';
import {useEffect} from'react';import{useRouter}from'next/navigation';import{hasSession}from'@/lib/auth';import s from'./route-loading.module.scss';
export default function IndexPage(){const router=useRouter();useEffect(()=>{router.replace(hasSession()?'/home':'/login')},[router]);return <main className={s.loading}>로그인 정보를 확인하고 있어요…</main>}
