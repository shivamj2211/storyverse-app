"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RatingStars from '../../../components/RatingStars';
import { api, authHeaders, getToken } from "../../../app/lib/api";

interface StoryDetail {
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverImageUrl?: string;
  avgRating: number;
  saved: boolean;
}

export default function StoryDetailPage({ params }: { params: { id: string } }) {
  const storyId = params.id;
  const router = useRouter();
  const [story, setStory] = useState<StoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    const fetchStory = async () => {
      setLoading(true);
      try {
        const res = await fetch(api(`/api/stories/${storyId}`), {
  headers: { ...authHeaders() },
  cache: "no-store",
});

        const data = await res.json();
        if (res.ok) {
          setStory(data);
        } else {
          setError(data.error || 'Failed to load story');
        }
      } catch (err) {
        setError('Unable to fetch story');
      } finally {
        setLoading(false);
      }
    };
    fetchStory();
  }, [storyId, token]);

  const handleSaveToggle = async () => {
    if (!token || !story) {
      alert('Please log in to save stories');
      return;
    }
    setSaving(true);
    const url = api(`/api/saved/${story.id}/save`);
    try {
      let res;
      if (story.saved) {
        res = await fetch(url, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        res = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      const data = await res.json();
      if (res.ok) {
        setStory({ ...story, saved: !story.saved });
      } else {
        alert(data.error || 'Unable to update saved status');
      }
    } catch (err) {
      alert('Unexpected error while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleRateStory = async (val: number) => {
    if (!token) {
      alert('Please log in to rate');
      return;
    }
    setRating(val);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ratings/story/${storyId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating: val }),
      });
      if (res.ok) {
        setRatingSubmitted(true);
        // Optionally fetch updated avg rating
        const updated = await res.json();
      } else {
        const data = await res.json();
        alert(data.error || 'Unable to submit rating');
      }
    } catch (err) {
      alert('Unexpected error submitting rating');
    }
  };

  const handleStart = async () => {
    if (!token) {
      alert('Please log in to start');
      return;
    }
    try {
      const res = await fetch(api(`/api/stories/${storyId}/start`), {
  method: "POST",
  headers: { ...authHeaders() },
});

      const data = await res.json();
      if (res.ok) {
        router.push(`/read/${data.runId}`);
      } else {
        alert(data.error || 'Unable to start story');
      }
    } catch (err) {
      alert('Unexpected error');
    }
  };

  if (loading) return <div>Loading story...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!story) return <div>No story found</div>;

  return (
    <div>
      <h2>{story.title}</h2>
      {story.coverImageUrl && <img src={story.coverImageUrl} alt={story.title} style={{ maxWidth: '100%', borderRadius: '8px' }} />}
      <p>{story.summary}</p>
      <p>Average rating: {story.avgRating.toFixed(2)}</p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
        <button onClick={handleStart}>Start</button>
        <button onClick={handleSaveToggle} disabled={saving}>
          {story.saved ? 'Unsave' : 'Save'}
        </button>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <h4>Rate this story</h4>
        <RatingStars value={rating} onChange={handleRateStory} disabled={ratingSubmitted} />
        {ratingSubmitted && <p style={{ fontSize: '0.8rem' }}>Thanks for rating!</p>}
      </div>
    </div>
  );
}