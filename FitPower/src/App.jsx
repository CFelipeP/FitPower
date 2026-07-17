import { lazy, Suspense } from 'react'
import Login from './components/Login/Login.jsx'
import GoogleCallback from './components/GoogleCallback/GoogleCallback.jsx'
import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { I18nProvider } from './context/I18nContext'
import { useScrollRestore } from './hooks/useScrollRestore'

import { AuthProvider } from './context/AuthContext'
import Toast from './components/Toast/Toast.jsx'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary.jsx'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute.jsx'
import { DashboardSkeleton } from './components/LoadingSkeleton/LoadingSkeleton.jsx'

const Navbar = lazy(() => import('./components/Navbar/Navbar.jsx'))
const Hero = lazy(() => import('./components/Hero/Hero.jsx'))
const Marquee = lazy(() => import('./components/Marquee/Marquee.jsx'))
const Programs = lazy(() => import('./components/Programs/Programs.jsx'))
const Features = lazy(() => import('./components/Features/Features.jsx'))
const Experience = lazy(() => import('./components/Experience/Experience.jsx'))
const Testimonials = lazy(() => import('./components/Testimonials/Testimonials.jsx'))
const Pricing = lazy(() => import('./components/Pricing/Pricing.jsx'))
const CTA = lazy(() => import('./components/CTA/CTA.jsx'))
const Contact = lazy(() => import('./components/Contact/Contact.jsx'))
const Footer = lazy(() => import('./components/Footer/Footer.jsx'))
const Register = lazy(() => import('./components/Register/Register.jsx'))

const TrainerRegister = lazy(() => import('./components/TrainerRegister/TrainerRegister.jsx'))
const AdminDashboard = lazy(() => import('./components/AdminDashboard/AdminDashboard.jsx'))
const CoachDashboard = lazy(() => import('./components/CoachDashboard/CoachDashboard.jsx'))
const CoachCatalog = lazy(() => import('./components/CoachCatalog/CoachCatalog.jsx'))
const CoachProfile = lazy(() => import('./components/CoachProfile/CoachProfile.jsx'))
const ClientDashboard = lazy(() => import('./components/ClientDashboard/ClientDashboard.jsx'))
const OnboardingWizard = lazy(() => import('./components/OnboardingWizard/OnboardingWizard.jsx'))
const Forum = lazy(() => import('./components/Forum/Forum.jsx'))
const Blog = lazy(() => import('./components/Blog/Blog.jsx'))
const BlogArticle = lazy(() => import('./components/Blog/BlogArticle.jsx'))
const Leaderboard = lazy(() => import('./components/Leaderboard/Leaderboard.jsx'))
const Settings = lazy(() => import('./components/Settings/Settings.jsx'))
const SubscriptionPlans = lazy(() => import('./components/SubscriptionPlans/SubscriptionPlans.jsx'))
const PaymentResult = lazy(() => import('./components/PaymentResult/PaymentResult.jsx'))
const CheckoutPage = lazy(() => import('./components/Checkout/CheckoutPage.jsx'))
const NotFound = lazy(() => import('./components/NotFound/NotFound.jsx'))
const AdminUsersPage = lazy(() => import('./components/AdminDashboard/AdminUsers.jsx'))
const CoachClientCheckins = lazy(() => import('./components/CoachDashboard/ClientCheckins.jsx'))
const CoachClientMetrics = lazy(() => import('./components/CoachDashboard/ClientMetrics.jsx'))
const CoachClientPhotos = lazy(() => import('./components/CoachDashboard/ClientPhotos.jsx'))
const CoachClientNutrition = lazy(() => import('./components/CoachDashboard/ClientNutrition.jsx'))
const CoachAssignRoutine = lazy(() => import('./components/CoachDashboard/AssignRoutine.jsx'))
const ClientGoalsPage = lazy(() => import('./components/ClientGoals/ClientGoals.jsx'))
const TDEECalculatorPage = lazy(() => import('./components/TDEECalculator/TDEECalculator.jsx'))

function Home() {
    return (
        <div className="noise grid-pattern">
            <Suspense fallback={null}><Hero /></Suspense>
            <Suspense fallback={null}><Marquee /></Suspense>
            <Suspense fallback={null}><Programs /></Suspense>
            <Suspense fallback={null}><Features /></Suspense>
            <Suspense fallback={null}><Experience /></Suspense>
            <Suspense fallback={null}><Testimonials /></Suspense>
            <Suspense fallback={null}><Pricing /></Suspense>
            <Suspense fallback={null}><CTA /></Suspense>
            <Suspense fallback={null}><Contact /></Suspense>
            <Suspense fallback={null}><Footer /></Suspense>
        </div>
    )
}

function App() {
    useScrollRestore()
    return (
        <ThemeProvider>
            <ToastProvider>
                <AuthProvider>
                <I18nProvider>
                <ErrorBoundary>
                    <Toast />
                    <Suspense fallback={null}><Navbar /></Suspense>
                    <Suspense fallback={<div className="page-loader" />}>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/auth/google/callback" element={<GoogleCallback />} />
                            <Route path="/register/trainer" element={<TrainerRegister />} />
                            <Route path="/admin/dashboard" element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <AdminDashboard />
                                </ProtectedRoute>
                            } />
                            <Route path="/coach/dashboard" element={
                                <ProtectedRoute allowedRoles={['coach']}>
                                    <Suspense fallback={<DashboardSkeleton />}><CoachDashboard /></Suspense>
                                </ProtectedRoute>
                            } />
                            <Route path="/client/dashboard" element={
                                <ProtectedRoute allowedRoles={['client']}>
                                    <Suspense fallback={<DashboardSkeleton />}><ClientDashboard /></Suspense>
                                </ProtectedRoute>
                            } />
                            <Route path="/onboarding" element={
                                <ProtectedRoute allowedRoles={['client']}>
                                    <Suspense fallback={<DashboardSkeleton />}><OnboardingWizard /></Suspense>
                                </ProtectedRoute>
                            } />
                            <Route path="/settings" element={
                                <ProtectedRoute>
                                    <Suspense fallback={<DashboardSkeleton />}><Settings /></Suspense>
                                </ProtectedRoute>
                            } />
                            <Route path="/admin/users" element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <Suspense fallback={<DashboardSkeleton />}><AdminUsersPage /></Suspense>
                                </ProtectedRoute>
                            } />
                            <Route path="/coach/clients/:id/checkins" element={
                                <ProtectedRoute allowedRoles={['coach']}>
                                    <Suspense fallback={<DashboardSkeleton />}><CoachClientCheckins /></Suspense>
                                </ProtectedRoute>
                            } />
                            <Route path="/coach/clients/:id/metrics" element={
                                <ProtectedRoute allowedRoles={['coach']}>
                                    <Suspense fallback={<DashboardSkeleton />}><CoachClientMetrics /></Suspense>
                                </ProtectedRoute>
                            } />
                            <Route path="/coach/clients/:id/photos" element={
                                <ProtectedRoute allowedRoles={['coach']}>
                                    <Suspense fallback={<DashboardSkeleton />}><CoachClientPhotos /></Suspense>
                                </ProtectedRoute>
                            } />
                            <Route path="/coach/clients/:id/nutrition" element={
                                <ProtectedRoute allowedRoles={['coach']}>
                                    <Suspense fallback={<DashboardSkeleton />}><CoachClientNutrition /></Suspense>
                                </ProtectedRoute>
                            } />
                            <Route path="/coach/clients/:id/routines" element={
                                <ProtectedRoute allowedRoles={['coach']}>
                                    <Suspense fallback={<DashboardSkeleton />}><CoachAssignRoutine /></Suspense>
                                </ProtectedRoute>
                            } />
                            <Route path="/client/goals" element={
                                <ProtectedRoute allowedRoles={['client']}>
                                    <Suspense fallback={<DashboardSkeleton />}><ClientGoalsPage /></Suspense>
                                </ProtectedRoute>
                            } />
                            <Route path="/client/nutrition" element={
                                <ProtectedRoute allowedRoles={['client']}>
                                    <Suspense fallback={<DashboardSkeleton />}><TDEECalculatorPage /></Suspense>
                                </ProtectedRoute>
                            } />
                            <Route path="/forum" element={<Forum />} />
                            <Route path="/blog" element={<Blog />} />
                            <Route path="/blog/:slug" element={
                                <Suspense fallback={<DashboardSkeleton />}><BlogArticle /></Suspense>
                            } />
                            <Route path="/coaches" element={<Suspense fallback={<DashboardSkeleton />}><CoachCatalog /></Suspense>} />
                            <Route path="/coaches/:id" element={<Suspense fallback={<DashboardSkeleton />}><CoachProfile /></Suspense>} />
                            <Route path="/leaderboard" element={<Leaderboard />} />
                            <Route path="/plans" element={<SubscriptionPlans standalone={true} />} />
                            <Route path="/payment/success" element={<PaymentResult />} />
                            <Route path="/payment/cancel" element={<PaymentResult />} />
                            <Route path="/checkout" element={<CheckoutPage />} />
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </Suspense>
                </ErrorBoundary>
                </I18nProvider>
                </AuthProvider>
            </ToastProvider>
        </ThemeProvider>
    )
}

export default App
