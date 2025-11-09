import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Mail, Briefcase, Building2, Upload, X, Camera } from "lucide-react";
export default function Profile() {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    job_title: "",
    team_name: "",
    bio: "",
    avatar_url: ""
  });
  useEffect(() => {
    checkAuth();
  }, []);
  const checkAuth = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    } else {
      setUser(user);
      await fetchProfile(user.id);
    }
  };
  const fetchProfile = async (userId: string) => {
    try {
      const {
        data,
        error
      } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (error) throw error;
      if (data) {
        setProfile({
          full_name: data.full_name || "",
          email: data.email || "",
          job_title: data.job_title || "",
          team_name: data.team_name || "",
          bio: data.bio || "",
          avatar_url: data.avatar_url || ""
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const {
        error
      } = await supabase.from("profiles").update({
        full_name: profile.full_name,
        job_title: profile.job_title,
        team_name: profile.team_name,
        bio: profile.bio,
        avatar_url: profile.avatar_url
      }).eq("id", user.id);
      if (error) throw error;
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated."
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 5MB",
        variant: "destructive"
      });
      return;
    }
    setUploadingAvatar(true);
    try {
      // Delete old avatar if exists
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Upload new avatar in user's folder
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;
      const {
        error: uploadError
      } = await supabase.storage.from('avatars').upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      // Update profile
      const {
        error: updateError
      } = await supabase.from('profiles').update({
        avatar_url: publicUrl
      }).eq('id', user.id);
      if (updateError) throw updateError;
      setProfile({
        ...profile,
        avatar_url: publicUrl
      });
      toast({
        title: "Success",
        description: "Profile picture updated successfully"
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload avatar",
        variant: "destructive"
      });
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      event.target.value = '';
    }
  };
  const handleRemoveAvatar = async () => {
    if (!profile.avatar_url || !user) return;
    try {
      // Delete from storage
      const path = profile.avatar_url.split('/avatars/')[1];
      if (path) {
        await supabase.storage.from('avatars').remove([path]);
      }

      // Update profile
      const {
        error
      } = await supabase.from('profiles').update({
        avatar_url: null
      }).eq('id', user.id);
      if (error) throw error;
      setProfile({
        ...profile,
        avatar_url: ""
      });
      toast({
        title: "Success",
        description: "Profile picture removed"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };
  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <Header user={user} />

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your personal information and preferences</p>
        </div>

        <div className="grid gap-6">
          {/* Avatar Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Your profile picture will be visible to other team members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="text-2xl">
                      {profile.full_name ? getInitials(profile.full_name) : <User className="w-12 h-12" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Upload overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                    <div className="flex gap-2">
                      <label htmlFor="avatar-upload" className="cursor-pointer">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:text-white hover:bg-white/20" disabled={uploadingAvatar} asChild>
                          <span>
                            <Camera className="h-4 w-4" />
                          </span>
                        </Button>
                      </label>
                      {profile.avatar_url && <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white hover:text-white hover:bg-white/20" onClick={handleRemoveAvatar} disabled={uploadingAvatar}>
                          <X className="h-4 w-4" />
                        </Button>}
                    </div>
                  </div>

                  <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                </div>

                <div className="flex-1">
                  <div className="space-y-2">
                    <Label>Upload Profile Picture</Label>
                    <p className="text-sm text-muted-foreground">
                      Click on your avatar to upload a new picture. Max size 5MB.
                    </p>
                    {uploadingAvatar && <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </div>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </Label>
                <Input id="full_name" placeholder="Enter your full name" value={profile.full_name} onChange={e => setProfile({
                ...profile,
                full_name: e.target.value
              })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input id="email" type="email" value={profile.email} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="job_title" className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Job Title
                </Label>
                <Input id="job_title" placeholder="e.g., Senior Attorney, Paralegal" value={profile.job_title} onChange={e => setProfile({
                ...profile,
                job_title: e.target.value
              })} />
              </div>

              

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" placeholder="Tell us about yourself..." value={profile.bio} onChange={e => setProfile({
                ...profile,
                bio: e.target.value
              })} rows={4} />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </main>
    </div>;
}