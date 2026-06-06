
import jsPDF from 'jspdf';
import { TestVersion, QuestionType } from '../types';

export const generatePDF = (
    version: TestVersion,
    includeKeys: boolean = false,
    footerText: string = "",
    testTitle: string = "VOCABULARY TEST",
    difficultyText: string = "",
    difficultyMode: string = "medium",
    orgName: string = "OTIA"
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20; 
  const BOTTOM_MARGIN = 15; 
  let cursorY = 20;

  const FONT_LOGO = 26;
  const FONT_TITLE = 18;
  const FONT_SECTION = 11; 
  const FONT_BODY = 10.5; // Slightly larger for readability while keeping compact
  const FONT_SMALL = 9;
  const LINE_HEIGHT = 5.2; 

  const cleanTitle = (title: string) => {
      return title
        .replace(/^section\s+\d+[:\.]?\s*/i, "")
        .replace(/^section\s+[a-z]+[:\.]?\s*/i, "")
        .trim();
  };

  const drawLogo = (y: number) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FONT_LOGO);
      doc.text(orgName, margin, y);
  };

  const drawHeaderMeta = (y: number) => {
      if (difficultyText || !includeKeys) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        const diffLabel = "DIFFICULTY:";
        const diffX = pageWidth - margin - 40;
        doc.text(diffLabel, diffX, y - 5);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (difficultyText) {
            doc.text(difficultyText, diffX + 18, y - 5, { align: 'center' });
            doc.setLineWidth(0.1);
            doc.line(diffX, y - 3, pageWidth - margin, y - 3);
        } else {
             doc.line(diffX, y - 3, pageWidth - margin, y - 3);
        }
      }
  }

  const checkPageBreak = (neededSpace: number) => {
    if (cursorY + neededSpace > pageHeight - BOTTOM_MARGIN) { 
      doc.addPage();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FONT_BODY);
      cursorY = 20;
      return true;
    }
    return false;
  };

  drawLogo(20);
  drawHeaderMeta(20);

  doc.setFontSize(FONT_TITLE);
  doc.setFont('helvetica', 'bold');
  doc.text(testTitle, pageWidth / 2, 20, { align: 'center' });
  
  cursorY = 30; 

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_SECTION);
  doc.text("Instructions", pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 5; 
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT_BODY);
  const introText = `This test has six sections. It is designed to check how well you understand and can use these words. Read the instructions for each section carefully. GOOD LUCK!`;
  const splitIntro = doc.splitTextToSize(introText, pageWidth - (margin * 2) - 40); 
  doc.text(splitIntro, pageWidth / 2, cursorY, { align: 'center' });
  cursorY += (splitIntro.length * 5) + 3.5;
  
  if (!includeKeys) {
      doc.setFontSize(FONT_SECTION);
      doc.setFont('helvetica', 'bold');
      doc.text(`${version.versionName}`, pageWidth / 2, cursorY, { align: 'center' });
      cursorY += 6; 
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FONT_BODY);
      
      const infoLineY = cursorY;
      const center = pageWidth / 2;
      doc.text("Name: __________________", center - 60, infoLineY, { align: 'center' });
      doc.text("Date: ____________", center, infoLineY, { align: 'center' });
      doc.text("Score: _______", center + 60, infoLineY, { align: 'center' });
      
      cursorY += 8; 
  } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FONT_SECTION);
      doc.setTextColor(180, 0, 0);
      doc.text(`ANSWER KEY - ${version.versionName}`, pageWidth / 2, cursorY, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      cursorY += 8;
  }

  version.sections.forEach((section, index) => {
    checkPageBreak(30);

    doc.setFillColor(50, 50, 50); 
    doc.rect(margin, cursorY, pageWidth - (margin * 2), 6, 'F'); 
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(FONT_SECTION);
    doc.setFont('helvetica', 'bold');
    doc.text(`SECTION ${index + 1}: ${cleanTitle(section.title).toUpperCase()}`, pageWidth / 2, cursorY + 4.5, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    cursorY += 8.5; 

    doc.setFontSize(FONT_SMALL);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    const splitInstructions = doc.splitTextToSize(section.instructions, pageWidth - (margin * 2));
    doc.text(splitInstructions, pageWidth / 2, cursorY, { align: 'center' });
    cursorY += (splitInstructions.length * 4) + 2; 

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_BODY);
    doc.setTextColor(0, 0, 0);

    if (section.type === QuestionType.FILL_IN_BLANK) {
        section.questions.forEach((q, qIndex) => {
            const prefix = `${qIndex + 1}. `;
            let questionText = q.text;
            if (!includeKeys && q.targetWord) {
                 const regex = new RegExp(`\\b${q.targetWord}\\b`, 'gi');
                 if (regex.test(questionText)) {
                     const replacement = `${q.targetWord.charAt(0)}________________________`;
                     questionText = questionText.replace(regex, replacement);
                 }
            }
            if (q.clue) questionText += ` (${q.clue})`;
            if (includeKeys && q.targetWord) {
                questionText += ` [ANS: ${q.targetWord}]`;
                doc.setTextColor(0, 100, 0);
            }
            const splitQ = doc.splitTextToSize(prefix + questionText, pageWidth - (margin * 2));
            checkPageBreak(splitQ.length * LINE_HEIGHT + 1.2); 
            doc.text(splitQ, margin, cursorY);
            doc.setTextColor(0, 0, 0);
            cursorY += (splitQ.length * LINE_HEIGHT) + 1.2; 
        });
    }

    else if (section.type === QuestionType.SYNONYM_ANTONYM) {
        checkPageBreak(20); 
        const col1 = margin + 5;
        const col2 = margin + 65; 
        const col3 = margin + 130;
        doc.setFillColor(248, 248, 248);
        doc.rect(margin, cursorY, pageWidth - (margin * 2), 6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(FONT_SMALL);
        doc.text("Word", col1, cursorY + 4);
        doc.text("Synonym/Antonym", col2, cursorY + 4);
        doc.text("Answer", col3, cursorY + 4);
        cursorY += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(FONT_BODY);
        section.questions.forEach((q, qIndex) => {
            checkPageBreak(8);
            const rowY = cursorY + 4;
            doc.text(`${qIndex + 1}. ${q.targetWord || ''}`, col1, rowY);
            doc.text(`${q.matchWord || ''}`, col2, rowY);
            if (includeKeys) {
                doc.setTextColor(0, 100, 0);
                doc.text(q.correctAnswer || '', col3, rowY);
                doc.setTextColor(0, 0, 0);
            } else {
                doc.text("__________________", col3, rowY);
            }
            doc.setDrawColor(240, 240, 240);
            doc.line(margin, cursorY + 7, pageWidth - margin, cursorY + 7);
            cursorY += 7.2; 
        });
    }

    else if (section.type === QuestionType.REWRITE) {
        section.questions.forEach((q, qIndex) => {
            const prefix = `${qIndex + 1}. `;
            let text = `${prefix}${q.text}`;
            if (q.targetWord) text += ` (${q.targetWord})`;
            const splitText = doc.splitTextToSize(text, pageWidth - (margin * 2));
            
            const neededHeight = (splitText.length * LINE_HEIGHT) + 12;
            checkPageBreak(neededHeight);
            
            doc.text(splitText, margin, cursorY);
            cursorY += (splitText.length * LINE_HEIGHT) + 2.5; // Tighter gap to line
            
            if (includeKeys) {
                doc.setTextColor(0, 100, 0);
                const ans = `Ans: ${q.correctAnswer || ''}`;
                const splitAns = doc.splitTextToSize(ans, pageWidth - (margin * 2));
                doc.text(splitAns, margin, cursorY);
                doc.setTextColor(0, 0, 0);
                cursorY += (splitAns.length * LINE_HEIGHT) + 5;
            } else {
                doc.setDrawColor(150, 150, 150);
                doc.setLineWidth(0.1);
                doc.line(margin, cursorY, pageWidth - margin, cursorY); 
                cursorY += 9; // Safety buffer to next question
            }
        });
    }

    else if (section.type === QuestionType.CONTEXTUAL) {
        if (!includeKeys) {
            const allWords = section.distractors || [];
            doc.setFontSize(FONT_BODY);
            let simX = margin + 5;
            let lines = 1;
            const bLineHeight = 6;
            allWords.forEach((word) => {
                if (!word) return;
                const wWidth = doc.getTextWidth(`[ ] ${word}`) + 8;
                if (simX + wWidth > pageWidth - margin - 5) {
                    simX = margin + 5;
                    lines++;
                }
                simX += wWidth;
            });
            const boxHeight = 10 + (lines * bLineHeight);
            checkPageBreak(boxHeight + 10);
            doc.setDrawColor(150, 150, 150);
            doc.rect(margin, cursorY, pageWidth - (margin * 2), boxHeight); 
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(FONT_SMALL);
            doc.text("WORD BANK", margin + 2, cursorY + 4);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(FONT_BODY);
            let bankX = margin + 5;
            let bankY = cursorY + 9;
            allWords.forEach((word) => {
                if (!word) return;
                const wWidth = doc.getTextWidth(`[ ] ${word}`) + 8;
                if (bankX + wWidth > pageWidth - margin - 5) {
                    bankX = margin + 5;
                    bankY += bLineHeight;
                }
                doc.rect(bankX, bankY - 3, 3, 3);
                doc.text(word, bankX + 5, bankY);
                bankX += wWidth;
            });
            cursorY += boxHeight + 4; 
        }
        section.questions.forEach((q, qIndex) => {
            const prefix = `${qIndex + 1}. `;
            let text = q.text || "";
            if (!includeKeys && q.targetWord) {
                 const regex = new RegExp(`\\b${q.targetWord}\\b`, 'gi');
                 if (regex.test(text)) text = text.replace(regex, "________________________");
            } else if (includeKeys && q.targetWord) {
                 text += ` [${q.targetWord}]`;
            }
            const splitText = doc.splitTextToSize(prefix + text, pageWidth - (margin * 2));
            checkPageBreak(splitText.length * LINE_HEIGHT + 1.8);
            if (includeKeys) doc.setTextColor(0, 100, 0);
            doc.text(splitText, margin, cursorY);
            doc.setTextColor(0, 0, 0);
            cursorY += (splitText.length * LINE_HEIGHT) + 1.8; 
        });
    }

    else if (section.type === QuestionType.SCRAMBLED) {
        section.questions.forEach((q, qIndex) => {
            const prefix = `${qIndex + 1}. `;
            let contextCue = "";
            let scrambledWords = q.text || "";

            const pipeIndex = scrambledWords.indexOf(' | ');
            if (pipeIndex !== -1) {
                contextCue = scrambledWords.slice(0, pipeIndex).trim();
                scrambledWords = scrambledWords.slice(pipeIndex + 3).trim();
            }

            // Estimate height: context cue + scrambled words + line + gap
            let estimatedHeight = 14;
            if (contextCue) {
                const splitContext = doc.splitTextToSize(prefix + contextCue, pageWidth - (margin * 2));
                estimatedHeight += splitContext.length * 4.5;
            }
            const splitScrambled = doc.splitTextToSize(scrambledWords, pageWidth - (margin * 2));
            estimatedHeight += splitScrambled.length * LINE_HEIGHT;
            checkPageBreak(estimatedHeight);

            // 1. Question number + context cue (small, gray)
            if (contextCue) {
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(FONT_SMALL);
                doc.setTextColor(100, 100, 100);
                const splitContext = doc.splitTextToSize(prefix + contextCue, pageWidth - (margin * 2));
                doc.text(splitContext, margin, cursorY);
                cursorY += (splitContext.length * 4.5);
            }

            // 2. Scrambled words (normal body font)
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(FONT_BODY);
            doc.setTextColor(0, 0, 0);
            doc.text(splitScrambled, margin, cursorY);
            cursorY += (splitScrambled.length * LINE_HEIGHT) + 2.5;

            // 3. Answer line or key
            if (includeKeys) {
                doc.setTextColor(0, 100, 0);
                const ans = `Ans: ${q.correctAnswer || ''}`;
                const splitAns = doc.splitTextToSize(ans, pageWidth - (margin * 2));
                doc.text(splitAns, margin, cursorY);
                doc.setTextColor(0, 0, 0);
                cursorY += (splitAns.length * LINE_HEIGHT) + 5;
            } else {
                doc.setDrawColor(150, 150, 150);
                doc.line(margin, cursorY, pageWidth - margin, cursorY);
                cursorY += 9;
            }
        });
    }

    else if (section.type === QuestionType.CREATIVE) {
        checkPageBreak(35);
        const words = section.questions.map(q => q.targetWord).filter(w => w).join(", ");
        doc.setFont('helvetica', 'bold');
        doc.text("Words:", margin, cursorY);
        doc.setFont('helvetica', 'normal');
        const splitWords = doc.splitTextToSize(words, pageWidth - (margin * 2) - 20);
        doc.text(splitWords, margin + 20, cursorY);
        cursorY += (splitWords.length * 5) + 3;
        doc.text("Your Story:", margin, cursorY);
        cursorY += 6;
        if (!includeKeys) {
            for (let i = 0; i < 6; i++) { 
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, cursorY, pageWidth - margin, cursorY);
                cursorY += 8; 
            }
        } else {
             doc.setFont('helvetica', 'italic');
             doc.setTextColor(100, 100, 100);
             doc.text("[Student's own response]", margin, cursorY);
             cursorY += 10;
             doc.setTextColor(0, 0, 0);
        }
    }

    cursorY += 5;
  });

  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 8, {align: 'center'});
  }

  doc.save(`VocabTest_${version.versionName.replace(/\s/g, '')}.pdf`);
};
