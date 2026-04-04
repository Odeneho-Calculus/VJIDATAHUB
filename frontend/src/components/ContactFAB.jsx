import React, { useState } from 'react';
import { X, Headphones, Users, Phone } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const ContactFAB = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { settings } = useSettings();
    const cd = settings?.contactDetails || {};

    const phone = cd.phone || '';
    const whatsapp = cd.whatsapp || '';
    const whatsappGroup = cd.whatsappGroup || '';
    const email = cd.email || '';

    const toggleOpen = () => setIsOpen(!isOpen);

    const contactOptions = [
        phone && {
            id: 'call',
            icon: <Phone className="w-6 h-6" />,
            label: 'Call',
            href: `tel:${phone}`,
            color: 'bg-blue-600',
        },
        whatsappGroup && {
            id: 'community',
            icon: <Users className="w-6 h-6" />,
            label: 'Community',
            href: whatsappGroup,
            color: 'bg-[#25D366]',
        },
        whatsapp && {
            id: 'whatsapp',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
            ),
            label: 'WhatsApp',
            href: `https://wa.me/${whatsapp}`,
            color: 'bg-[#25D366]',
        },
        email && {
            id: 'email',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.573l8.073-6.08c1.618-1.214 3.927-.059 3.927 1.964z" />
                </svg>
            ),
            label: 'Email',
            href: `mailto:${email}`,
            color: 'bg-[#EA4335]',
        },
    ].filter(Boolean);

    // Hide FAB entirely if no contact details are configured
    if (contactOptions.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
            {/* Sub FABs */}
            <div className={`flex flex-col items-end gap-3 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-0'}`}>
                {contactOptions.map((option) => (
                    <div key={option.id} className="flex items-center gap-2 pointer-events-auto">
                        <span className="px-3 py-1.5 rounded-full bg-white text-slate-800 text-xs font-semibold whitespace-nowrap shadow-md border border-slate-200">
                            {option.label}
                        </span>
                        <a
                            href={option.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${option.color} text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center`}
                            title={option.label}
                        >
                            {option.icon}
                        </a>
                    </div>
                ))}
            </div>

            {/* Main FAB */}
            <button
                onClick={toggleOpen}
                className={`${isOpen ? 'bg-red-500 rotate-90' : 'bg-blue-600 contact-fab-heartbeat'} text-white p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center hover:scale-110 active:scale-95 pointer-events-auto self-end`}
            >
                    {isOpen ? <X className="w-7 h-7" /> : <Headphones className="w-7 h-7" />}
            </button>
        </div>
    );
};

export default ContactFAB;
