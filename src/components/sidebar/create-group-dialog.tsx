
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Chat, User, GroupPermissions } from "@/lib/types";
import { ScrollArea } from "../ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Checkbox } from "../ui/checkbox";
import { ArrowLeft, Settings, MessageSquare, UserPlus, ShieldCheck, Pencil, Users } from "lucide-react";
import { Switch } from "../ui/switch";

interface CreateGroupDialogProps {
  children: React.ReactNode;
  chats: Chat[];
  onCreateGroup: (group: { 
    name: string; 
    description: string; 
    members: string[];
    permissions: GroupPermissions;
  }) => void;
}

const defaultPermissions: GroupPermissions = {
    membersCanEditSettings: true,
    membersCanSendMessages: true,
    membersCanAddOthers: true,
    adminsCanApproveNewMembers: false,
};

function PermissionsDialog({ open, onOpenChange, permissions, setPermissions }: { open: boolean, onOpenChange: (open: boolean) => void, permissions: GroupPermissions, setPermissions: (p: GroupPermissions) => void }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Group Permissions</DialogTitle>
                    <DialogDescription>
                        Choose what members and admins can do in this group.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <div>
                        <h3 className="mb-4 text-sm font-medium text-foreground">Members can:</h3>
                        <div className="space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <Pencil className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <Label htmlFor="edit-settings" className="font-semibold">Edit group settings</Label>
                                        <p className="text-xs text-muted-foreground">Includes name, icon, description, etc.</p>
                                    </div>
                                </div>
                                <Switch id="edit-settings" checked={permissions.membersCanEditSettings} onCheckedChange={(c) => setPermissions({...permissions, membersCanEditSettings: c})} />
                            </div>
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                                    <Label htmlFor="send-messages" className="font-semibold">Send new messages</Label>
                                </div>
                                <Switch id="send-messages" checked={permissions.membersCanSendMessages} onCheckedChange={(c) => setPermissions({...permissions, membersCanSendMessages: c})} />
                            </div>
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <UserPlus className="h-5 w-5 text-muted-foreground" />
                                    <Label htmlFor="add-members" className="font-semibold">Add other members</Label>
                                </div>
                                <Switch id="add-members" checked={permissions.membersCanAddOthers} onCheckedChange={(c) => setPermissions({...permissions, membersCanAddOthers: c})} />
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 className="mb-4 text-sm font-medium text-foreground">Admins can:</h3>
                         <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <ShieldCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <Label htmlFor="approve-members" className="font-semibold">Approve new members</Label>
                                    <p className="text-xs text-muted-foreground">Admins must approve anyone who wants to join.</p>
                                </div>
                            </div>
                            <Switch id="approve-members" checked={permissions.adminsCanApproveNewMembers} onCheckedChange={(c) => setPermissions({...permissions, adminsCanApproveNewMembers: c})} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function CreateGroupDialog({ children, onCreateGroup, chats }: CreateGroupDialogProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<GroupPermissions>(defaultPermissions);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const contacts = chats.filter(chat => !chat.isGroup && chat.contact).map(chat => chat.contact as User);

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const resetState = () => {
    setStep(1);
    setName("");
    setDescription("");
    setSelectedMembers([]);
    setPermissions(defaultPermissions);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetState();
    }
    setIsOpen(open);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && selectedMembers.length > 0) {
      onCreateGroup({ name, description, members: selectedMembers, permissions });
      handleClose(false);
    }
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md p-0">
        {step === 1 && (
          <>
            <DialogHeader className="p-4 border-b">
              <DialogTitle>Add group members</DialogTitle>
              <DialogDescription>Select at least one contact to create a group.</DialogDescription>
            </DialogHeader>
            <div className="p-4">
                <Input placeholder="Search name or number" />
            </div>
            <ScrollArea className="h-64 px-4">
                <div className="space-y-1">
                    {contacts.map(contact => (
                        <div key={contact.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted" onClick={() => handleMemberToggle(contact.id)}>
                            <Checkbox 
                                checked={selectedMembers.includes(contact.id)}
                                onCheckedChange={() => handleMemberToggle(contact.id)}
                                id={`member-${contact.id}`}
                            />
                             <Avatar className="h-10 w-10">
                                <AvatarImage src={contact.avatar} alt={contact.name} />
                                <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <Label htmlFor={`member-${contact.id}`} className="font-normal flex-1 cursor-pointer">{contact.name}</Label>
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <DialogFooter className="p-4 border-t">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button type="button" disabled={selectedMembers.length === 0} onClick={() => setStep(2)}>
                Next
              </Button>
            </DialogFooter>
          </>
        )}
        {step === 2 && (
          <>
            <DialogHeader className="p-4 border-b flex-row items-center">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
              <DialogTitle>New group</DialogTitle>
            </DialogHeader>
            <form id="create-group-form" onSubmit={handleSubmit}>
              <div className="grid gap-4 p-4">
                <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={`https://picsum.photos/seed/${name || 'new-group'}/100/100`} />
                        <AvatarFallback><Users /></AvatarFallback>
                    </Avatar>
                    <div className="space-y-2 flex-1">
                         <Label htmlFor="group-name">Group Name</Label>
                        <Input
                            id="group-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Family, Work Friends"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="group-description">Group Description (Optional)</Label>
                  <Textarea
                    id="group-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this group about?"
                  />
                </div>

                 <div className="space-y-2">
                    <Label>Group Permissions</Label>
                    <Button type="button" variant="outline" className="w-full justify-start" onClick={() => setIsPermissionsOpen(true)}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Configure group permissions</span>
                    </Button>
                </div>
              </div>
            </form>
            <DialogFooter className="p-4 border-t">
              <Button type="submit" form="create-group-form" disabled={!name.trim()}>
                Create Group
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
    <PermissionsDialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen} permissions={permissions} setPermissions={setPermissions} />
    </>
  );
}

    