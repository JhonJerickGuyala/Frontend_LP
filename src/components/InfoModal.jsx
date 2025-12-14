import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const InfoModal = ({ isOpen, onClose, type }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = {
    about: {
      title: "About Us",
      content: `
        Welcome to **La Piscina Di Concepcion Resort**! One of most affordable resort located in the beautiful municipality of Balayan, Batangas. We take pride in offering a budget-friendly experience with an entrance fee of only 50 pesos. When you arrive at our resort, you'll immediately feel our relaxed and friendly atmosphere that has made us a favorite spot for families, friends, and travelers looking to relax and unwind.

        We offer a variety of services to make your stay enjoyable, including comfortable accommodations, refreshing public swimming pools, and different recreational areas like cottages, tables, and cabins. Whether you want to swim, relax, or enjoy a quiet day by the water, we provide a simple and enjoyable experience for everyone.

        Over the years, we've grown into a well-loved local destination where our guests appreciate our clean surroundings, affordable prices, and the genuine warmth of our staff. We continuously work to improve our facilities to ensure you have a pleasant and memorable stay with us. Our resort has become the go-to spot for quick getaways and small celebrations in our community.

        **Why Choose Us:**
        • We offer an affordable 50 pesos entrance fee
        • We maintain clean and well-kept facilities
        • Our staff is friendly and always ready to help
        • We're perfect for your family and group outings
        • We provide various amenities for your relaxation
        • We're always improving for your better experience
      `
    },
    faq: {
      title: "Frequently Asked Questions",
      content: `
        **Q: What are your operating hours?**
        A: We're open Monday-Thursday 8AM-10PM, Friday-Saturday 8AM-11PM, and Sunday 8AM-9PM.
        
        **Q: Do I need to make reservations in advance?**
        A: While walk-ins are welcome, we highly recommend making reservations to guarantee your spot.
        
        **Q: What payment methods do you accept?**
        A: Customers can pay via any payment method because we're using Instapay QR. We only require proof of payment, and all transactions will be reflected in our single app/account.
        
        **Q: Is there parking available?**
        A: Yes, we provide parking space for our guests.
        
        **Q: Can I bring outside food?**
        A: Yes, bringing food from outside are welcome.
      `
    },
    policy: {
      title: "Resort Policies",
      content: `
        **Reservation Policy:**
        • Reservations must be made at least 6-12 hours in advance.
        • A 20% reservation fee from the total availed service/s are required to prevent "no-shows".
        • Cancellations can be made only if your reservation is still spending. Additionally, if payment has already been made, there is no refund policy, as it covers preparation costs. Please ensure you are sure before booking.
        
        **Safety Rules:**
        • Children must be supervised at all times
        • Follow safety instructions
        • No running on wet surfaces
        
        **General Rules:**
        • Secure your personal belongings at all times
        • Respect other guests' privacy
        • Keep the resort clean
        
        **We reserve the right to refuse service to anyone violating resort policies.**
      `
    }
  };

  const content = modalContent[type];

  const renderContent = (text) => {
    return text.split('\n\n').map((paragraph, index) => {
      if (paragraph.trim() === '') return null;
      
      // Check if paragraph is a list item
      if (paragraph.trim().startsWith('•')) {
        return (
          <ul key={index} className="mb-4 space-y-2">
            {paragraph.split('\n').map((item, itemIndex) => (
              item.trim().startsWith('•') && (
                <li key={itemIndex} className="flex items-start text-gray-700 leading-relaxed">
                  <span className="text-lp-orange mr-2 mt-1">•</span>
                  <span>{item.replace('•', '').trim()}</span>
                </li>
              )
            ))}
          </ul>
        );
      }

      // Regular paragraph with bold formatting
      return (
        <div key={index} className="mb-4 last:mb-0">
          {paragraph.split('**').map((text, i) => {
            if (i % 2 === 1) {
              // Bold text
              return (
                <strong key={i} className="text-lp-dark font-semibold">
                  {text}
                </strong>
              );
            } else {
              // Regular text with line breaks
              return text.split('\n').map((line, lineIndex, lines) => (
                <React.Fragment key={lineIndex}>
                  {line}
                  {lineIndex < lines.length - 1 && <br />}
                </React.Fragment>
              ));
            }
          })}
        </div>
      );
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg sm:rounded-xl shadow-xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 md:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 font-header pr-4">
            {content.title}
          </h2>
          <button
            onClick={onClose}
            className="shrink-0 p-1 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} className="sm:w-5 sm:h-5 text-gray-600" />
          </button>
        </div>

        {/* Content - With proper scrolling */}
        <div className="p-4 sm:p-5 md:p-6 max-h-[60vh] sm:max-h-[65vh] overflow-y-auto">
          <div className="text-sm sm:text-base leading-relaxed sm:leading-loose text-gray-700">
            {renderContent(content.content)}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 sm:p-5 md:p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 text-sm sm:text-base bg-lp-orange text-white rounded-lg hover:bg-lp-orange-hover transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
