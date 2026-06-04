'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Edit2, X, Phone, User, ChevronDown, ChevronUp } from 'lucide-react';

type WeddingRole = {
  id: string;
  role_name: string;
  description: string;
  responsibilities: string[];
  assignee: string;
  contact: string;
  created_at: string;
};

type RoleForm = {
  role_name: string;
  description: string;
  responsibilities: string[];
  assignee: string;
  contact: string;
};

const emptyForm: RoleForm = {
  role_name: '',
  description: '',
  responsibilities: [''],
  assignee: '',
  contact: '',
};

export default function AssignmentsPage() {
  const [roles, setRoles] = useState<WeddingRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<RoleForm>(emptyForm);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  async function fetchRoles() {
    const { data } = await supabase
      .from('wedding_roles')
      .select('*')
      .order('created_at', { ascending: true });
    setRoles(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchRoles(); }, []);

  function openAdd() {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function openEdit(role: WeddingRole) {
    setEditId(role.id);
    setForm({
      role_name: role.role_name,
      description: role.description,
      responsibilities: role.responsibilities.length > 0 ? role.responsibilities : [''],
      assignee: role.assignee,
      contact: role.contact,
    });
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  async function saveRole(e: React.FormEvent) {
    e.preventDefault();
    if (!form.role_name.trim()) return;

    const payload = {
      role_name: form.role_name.trim(),
      description: form.description.trim(),
      responsibilities: form.responsibilities.map((r) => r.trim()).filter(Boolean),
      assignee: form.assignee.trim(),
      contact: form.contact.trim(),
    };

    if (editId) {
      await supabase.from('wedding_roles').update(payload).eq('id', editId);
    } else {
      await supabase.from('wedding_roles').insert(payload);
    }

    setForm(emptyForm);
    setShowForm(false);
    setEditId(null);
    fetchRoles();
  }

  async function deleteRole(id: string) {
    if (!confirm('Delete this role?')) return;
    await supabase.from('wedding_roles').delete().eq('id', id);
    fetchRoles();
  }

  function setResponsibility(index: number, value: string) {
    const updated = [...form.responsibilities];
    updated[index] = value;
    setForm({ ...form, responsibilities: updated });
  }

  function addResponsibility() {
    setForm({ ...form, responsibilities: [...form.responsibilities, ''] });
  }

  function removeResponsibility(index: number) {
    const updated = form.responsibilities.filter((_, i) => i !== index);
    setForm({ ...form, responsibilities: updated.length > 0 ? updated : [''] });
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gold">Assignments</h1>
          <p className="text-warm-gray-light text-sm mt-1">
            {roles.length} role{roles.length !== 1 ? 's' : ''} defined
          </p>
        </div>
        <button className="btn-gold flex items-center gap-2" onClick={openAdd}>
          <Plus size={16} /> Add Role
        </button>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div ref={formRef} className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gold">
              {editId ? 'Edit Role' : 'New Role'}
            </h3>
            <button onClick={cancelForm} className="text-warm-gray-light hover:text-warm-gray">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={saveRole}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Role Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Master of Ceremonies"
                  value={form.role_name}
                  onChange={(e) => setForm({ ...form, role_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Assigned To</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray-light pointer-events-none" />
                  <input
                    type="text"
                    placeholder="e.g., Uncle Rohan"
                    value={form.assignee}
                    onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                    style={{ paddingLeft: '2rem' }}
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-warm-gray mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief overview of what this role involves..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#e0d8d0] rounded-lg bg-white text-[#3d3530] focus:outline-none focus:border-gold focus:shadow-[0_0_0_2px_rgba(184,134,11,0.1)] transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-gray mb-1">Contact</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-gray-light pointer-events-none" />
                  <input
                    type="text"
                    placeholder="+94 77 xxx xxxx"
                    value={form.contact}
                    onChange={(e) => setForm({ ...form, contact: e.target.value })}
                    style={{ paddingLeft: '2rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Responsibilities */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-warm-gray">Responsibilities</label>
                <button
                  type="button"
                  onClick={addResponsibility}
                  className="text-xs text-gold hover:text-gold-dark font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              <div className="space-y-2">
                {form.responsibilities.map((r, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-warm-gray-light text-xs w-4 text-right shrink-0">{i + 1}.</span>
                    <input
                      type="text"
                      placeholder="e.g., Welcome guests at the entrance"
                      value={r}
                      onChange={(e) => setResponsibility(i, e.target.value)}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeResponsibility(i)}
                      className="text-warm-gray-light hover:text-red-500 transition-colors shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn-gold">
                {editId ? 'Update Role' : 'Save Role'}
              </button>
              <button type="button" className="btn-outline" onClick={cancelForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Role Cards */}
      {loading ? (
        <div className="text-center py-12 text-warm-gray-light">Loading assignments...</div>
      ) : roles.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <User size={24} className="text-gold" />
          </div>
          <p className="text-warm-gray font-medium mb-1">No roles defined yet</p>
          <p className="text-warm-gray-light text-sm">Click &quot;Add Role&quot; to assign responsibilities to your wedding crew.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => {
            const isExpanded = expandedId === role.id;
            const hasResponsibilities = role.responsibilities.length > 0;
            const previewCount = 3;

            return (
              <div key={role.id} className="card flex flex-col gap-0 p-0 overflow-hidden">
                {/* Card Header */}
                <div className="px-5 pt-5 pb-4 border-b border-ivory-dark">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-base font-bold text-gold leading-tight">{role.role_name}</h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(role)}
                        className="p-1.5 text-warm-gray-light hover:text-gold transition-colors rounded"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => deleteRole(role.id)}
                        className="p-1.5 text-warm-gray-light hover:text-red-500 transition-colors rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {role.description && (
                    <p className="text-xs text-warm-gray-light leading-relaxed">{role.description}</p>
                  )}
                </div>

                {/* Responsibilities */}
                {hasResponsibilities && (
                  <div className="px-5 py-3 flex-1">
                    <p className="text-[10px] font-semibold text-warm-gray-light uppercase tracking-wider mb-2">Responsibilities</p>
                    <ul className="space-y-1.5">
                      {(isExpanded ? role.responsibilities : role.responsibilities.slice(0, previewCount)).map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-warm-gray">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                    {role.responsibilities.length > previewCount && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : role.id)}
                        className="mt-2 flex items-center gap-1 text-xs text-gold hover:text-gold-dark font-medium transition-colors"
                      >
                        {isExpanded ? (
                          <><ChevronUp size={12} /> Show less</>
                        ) : (
                          <><ChevronDown size={12} /> +{role.responsibilities.length - previewCount} more</>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Assignee + Contact Footer */}
                {(role.assignee || role.contact) && (
                  <div className="px-5 py-3 mt-auto border-t border-ivory-dark bg-ivory/40">
                    {role.assignee && (
                      <div className="flex items-center gap-2 text-xs text-warm-gray mb-1">
                        <User size={12} className="text-gold shrink-0" />
                        <span className="font-medium">{role.assignee}</span>
                      </div>
                    )}
                    {role.contact && (
                      <div className="flex items-center gap-2 text-xs text-warm-gray-light">
                        <Phone size={12} className="text-gold shrink-0" />
                        <span>{role.contact}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
