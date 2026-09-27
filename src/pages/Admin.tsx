import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { SongManager } from '@/components/admin/SongManager';
import { ArtistManager } from '@/components/admin/ArtistManager';
import { AlbumManager } from '@/components/admin/AlbumManager';
import { UserManager } from '@/components/admin/UserManager';
import { useAdminStore } from '@/store/adminStore';

export default function Admin() {
  const { activeTab, setActiveTab } = useAdminStore();

  const [openCreateSong, setOpenCreateSong] = useState(false);
  const [openCreateArtist, setOpenCreateArtist] = useState(false);
  const [openCreateAlbum, setOpenCreateAlbum] = useState(false);

  return (
    <AdminLayout>
      {activeTab === 'overview' && (
        <AdminOverview
          onNavigateTab={(tab) => setActiveTab(tab)}
          onOpenCreateSong={() => {
            setActiveTab('songs');
            setOpenCreateSong(true);
          }}
          onOpenCreateArtist={() => {
            setActiveTab('artists');
            setOpenCreateArtist(true);
          }}
          onOpenCreateAlbum={() => {
            setActiveTab('albums');
            setOpenCreateAlbum(true);
          }}
        />
      )}

      {activeTab === 'songs' && (
        <SongManager
          isCreateOpen={openCreateSong}
          onCloseCreate={() => setOpenCreateSong(false)}
        />
      )}

      {activeTab === 'artists' && (
        <ArtistManager
          isCreateOpen={openCreateArtist}
          onCloseCreate={() => setOpenCreateArtist(false)}
        />
      )}

      {activeTab === 'albums' && (
        <AlbumManager
          isCreateOpen={openCreateAlbum}
          onCloseCreate={() => setOpenCreateAlbum(false)}
        />
      )}

      {activeTab === 'users' && <UserManager />}
    </AdminLayout>
  );
}
