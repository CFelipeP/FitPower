import { Flame, Dumbbell, HeartPulse, Wind, Bike, Swords, StretchHorizontal, Target } from 'lucide-react'
import './Marquee.css'

const items = [
    { icon: Flame, text: 'HIIT' },
    { icon: Dumbbell, text: 'Strength' },
    { icon: HeartPulse, text: 'Cardio' },
    { icon: Wind, text: 'Yoga' },
    { icon: Bike, text: 'Cycling' },
    { icon: Swords, text: 'Boxing' },
    { icon: StretchHorizontal, text: 'Stretching' },
    { icon: Target, text: 'Functional' },
]

export default function Marquee() {
    return (
        <section className="marquee-section">
            <div className="marquee-track">
                {[...items, ...items].map((item, i) => (
                    <span key={i} className="marquee-item">
                        <item.icon size={16} className="marquee-icon" />
                        {item.text}
                    </span>
                ))}
            </div>
        </section>
    )
}