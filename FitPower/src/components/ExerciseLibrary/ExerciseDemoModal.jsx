import { Dumbbell, X } from 'lucide-react'
import './ExerciseDemoModal.css'

export default function ExerciseDemoModal({ exercise, onClose }) {
    if (!exercise) return null

    const linkedVideo = exercise.linkedVideos && exercise.linkedVideos.length > 0 ? exercise.linkedVideos[0] : null
    // Repository demos are animation GIFs (© Gym visual) — shown as images.
    const isGif = (exercise.gifUrl && exercise.gifUrl.endsWith('.gif')) || ((exercise.video_url || exercise.videoUrl) || '').endsWith('.gif')
    const demoUrl = isGif ? (exercise.gifUrl || exercise.video_url || exercise.videoUrl) : (linkedVideo ? `/api/${linkedVideo.filePath}` : (exercise.video_url || exercise.videoUrl || null))

    return (
        <div className="edm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="edm-modal" onClick={e => e.stopPropagation()}>
                <button className="edm-close" onClick={onClose}><X size={18} /></button>

                {isGif ? (
                    <div className="edm-video-wrap">
                        <img className="edm-video cm-el-repo-gif" src={demoUrl} alt={`${exercise.name} demo`} loading="lazy" />
                        {exercise.source === 'github_exercises_dataset' && (
                            <span className="cm-el-attribution">© Gym visual — gymvisual.com</span>
                        )}
                    </div>
                ) : demoUrl ? (
                    <div className="edm-video-wrap">
                        <video className="edm-video" src={demoUrl} controls autoPlay />
                    </div>
                ) : (
                    <div className="edm-no-video">
                        <Dumbbell size={40} />
                        <p className="edm-no-video-text">Demo not available</p>
                    </div>
                )}

                <div className="edm-body">
                    <h2 className="edm-name">{exercise.name}</h2>

                    <div className="edm-tags">
                        {exercise.muscle_group || exercise.muscleGroup ? (
                            <span className="edm-tag edm-tag-muscle">{exercise.muscle_group || exercise.muscleGroup}</span>
                        ) : null}
                        {exercise.equipment ? (
                            <span className="edm-tag edm-tag-equip">{exercise.equipment}</span>
                        ) : null}
                    </div>

                    {(exercise.description) && (
                        <div className="edm-section">
                            <h4 className="edm-section-title">Description</h4>
                            <p className="edm-section-text">{exercise.description}</p>
                        </div>
                    )}

                    {exercise.muscle_group || exercise.muscleGroup ? (
                    <div className="edm-section">
                        <h4 className="edm-section-title">Target Muscles</h4>
                        <div className="edm-target-muscles">
                            <Dumbbell size={18} />
                            <span>{exercise.muscle_group || exercise.muscleGroup}</span>
                        </div>
                    </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
